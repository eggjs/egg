import { EventEmitter } from 'node:events';
import { appendFileSync, createReadStream, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type {
  CreateRunInput,
  CreateThreadOptions,
  GetThreadOptions,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  AgentMessage,
  AgentStore,
  StreamEvent,
} from '@eggjs/tegg-types/agent-runtime';
import {
  RunStatus,
  AgentObjectType,
  AgentConflictError,
  AgentInvalidRequestError,
  AgentNotFoundError,
  AgentTimeoutError,
} from '@eggjs/tegg-types/agent-runtime';
import type { EggLogger } from 'egg-logger';

import { MessageConverter } from './MessageConverter.ts';
import { RunBuilder } from './RunBuilder.ts';
import type { SSEWriter } from './SSEWriter.ts';

const HEARTBEAT_INTERVAL_MS = 10_000;
const EVENT_DIR = join(tmpdir(), 'agent-runtime-events');
const DEFAULT_CANCEL_COMMIT_TIMEOUT_MS = 30_000;

function validateMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new AgentInvalidRequestError("'metadata' must be an object");
  }
  return value as Record<string, unknown>;
}

interface RunEventBuffer {
  filePath: string;
  lastSeq: number;
  done: boolean;
  emitter: EventEmitter;
}

export const AGENT_RUNTIME: unique symbol = Symbol('agentRuntime');

/**
 * The executor interface — execRun is required so the runtime can delegate
 * execution back through the controller's prototype chain (AOP/mock friendly).
 *
 * `isSessionCommitted` is an optional hook that lets the executor tell the
 * runtime when its underlying session has been persisted to storage (e.g. the
 * Claude Code SDK jsonl file). The runtime uses this to decide when a pending
 * `cancelRun` can safely abort and persist the thread. See AgentHandler.ts
 * for the semantics and the default heuristic used when this hook is absent.
 */
export interface AgentExecutor {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage>;
  isSessionCommitted?(msg: AgentMessage, history: AgentMessage[]): boolean | Promise<boolean>;
}

export interface AgentRuntimeOptions {
  executor: AgentExecutor;
  store: AgentStore;
  logger: EggLogger;
  /**
   * How long cancelRun should wait for the executor's session to become
   * committed before giving up and marking the run as failed. Defaults to
   * 30 seconds.
   */
  cancelCommitTimeoutMs?: number;
}

interface RunTaskState {
  promise: Promise<void>;
  abortController: AbortController;
  /** True once the executor has reported (or the heuristic has detected) that
   *  its session is safely persisted and the run can be cancelled cleanly. */
  committed: boolean;
  /** Emits 'commit' the first time committed flips to true, and 'end' when the
   *  task's execution finally finishes (success, failure, or abort). */
  emitter: EventEmitter;
}

export class AgentRuntime {
  private static readonly TERMINAL_RUN_STATUSES = new Set<RunStatus>([
    RunStatus.Completed,
    RunStatus.Failed,
    RunStatus.Cancelled,
    RunStatus.Expired,
  ]);

  // Statuses that must short-circuit the "write Completed" path in the
  // execution loops. Covers a TOCTOU window where another actor (most
  // notably cancelRun's commit-timeout watchdog, which writes Failed) sets
  // a terminal state while this worker has just exited the for-await loop
  // but hasn't yet written rb.complete(usage). Completed is intentionally
  // excluded so the normal success path is not routed through here.
  private static readonly POST_LOOP_TERMINAL_STATUSES = new Set<RunStatus>([
    RunStatus.Cancelling,
    RunStatus.Cancelled,
    RunStatus.Failed,
    RunStatus.Expired,
  ]);

  private store: AgentStore;
  private runningTasks: Map<string, RunTaskState>;
  private runBuffers: Map<string, RunEventBuffer>;
  private executor: AgentExecutor;
  private logger: EggLogger;
  private cancelCommitTimeoutMs: number;

  constructor(options: AgentRuntimeOptions) {
    this.executor = options.executor;
    this.store = options.store;
    if (!options.logger) {
      throw new Error('AgentRuntimeOptions.logger is required');
    }
    this.logger = options.logger;
    this.cancelCommitTimeoutMs = options.cancelCommitTimeoutMs ?? DEFAULT_CANCEL_COMMIT_TIMEOUT_MS;
    this.runningTasks = new Map();
    this.runBuffers = new Map();
  }

  async createThread(options?: CreateThreadOptions): Promise<ThreadObject> {
    const thread = await this.store.createThread(options?.metadata);
    return {
      id: thread.id,
      object: AgentObjectType.Thread,
      createdAt: thread.createdAt,
      metadata: thread.metadata ?? {},
    };
  }

  async getThread(threadId: string, options?: GetThreadOptions): Promise<ThreadObjectWithMessages> {
    const thread = await this.store.getThread(threadId, options);
    return {
      id: thread.id,
      object: AgentObjectType.Thread,
      createdAt: thread.createdAt,
      metadata: thread.metadata ?? {},
      messages: thread.messages,
    };
  }

  /**
   * Resolve the thread for a run and persist the run's `metadata` onto the
   * thread. The same `metadata` is also stored on the run record (see
   * {@link AgentStore.createRun}); here it initializes an auto-created thread or
   * is shallow-merged into an existing thread's `meta.json`.
   */
  private async ensureThread(input: CreateRunInput): Promise<{ threadId: string; input: CreateRunInput }> {
    const metadata = validateMetadata(input.metadata);
    if (input.threadId) {
      const thread = await this.store.getThread(input.threadId);
      if (metadata && Object.keys(metadata).length > 0) {
        if (!this.store.updateThreadMetadata) {
          throw new Error('AgentStore does not support updating thread metadata');
        }
        // Best-effort: the same metadata is already persisted on the run record,
        // so a failure to mirror it onto the thread must not fail run creation.
        try {
          await this.store.updateThreadMetadata(input.threadId, metadata);
        } catch (err) {
          this.logger.error('[AgentRuntime] failed to persist metadata onto thread threadId=%s:', input.threadId, err);
        }
      }
      const isResume = thread.messages.length > 0;
      return { threadId: input.threadId, input: { ...input, isResume } };
    }
    const thread = await this.store.createThread(metadata);
    return { threadId: thread.id, input: { ...input, threadId: thread.id, isResume: false } };
  }

  async syncRun(input: CreateRunInput, signal?: AbortSignal): Promise<RunObject> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // Bridge external signal to an internal AbortController so cancelRun can abort syncRun
    const abortController = new AbortController();
    if (signal) {
      if (signal.aborted) {
        abortController.abort();
      } else {
        signal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    // Register in runningTasks so cancelRun can find and await this run.
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>((r) => {
      resolveTask = r;
    });
    const task: RunTaskState = {
      promise: taskPromise,
      abortController,
      committed: false,
      emitter: new EventEmitter(),
    };
    this.runningTasks.set(run.id, task);

    const streamMessages: AgentMessage[] = [];
    // Persist a turn's transcript to the thread at most once, even if a later
    // store call (e.g. updateRun) throws after a successful append and routes
    // us through a catch-block persist. Guarded by task.committed so we never
    // write a thread the executor has not persisted to its own session.
    let messagesPersisted = false;
    const persistPartialOnce = async (): Promise<void> => {
      if (!task.committed || messagesPersisted) return;
      messagesPersisted = true;
      await this.persistPartialMessages(threadId, input, streamMessages);
    };
    try {
      await this.store.updateRun(run.id, rb.start());

      for await (const msg of this.executor.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) {
          await persistPartialOnce();
          await this.finaliseAbortedRun(run.id);
          const latest = await this.store.getRun(run.id);
          return RunBuilder.fromRecord(latest).snapshot();
        }
        streamMessages.push(msg);
        await this.markCommittedIfNeeded(task, msg, streamMessages);
      }

      // TOCTOU: another worker (e.g. cancelRun, or its commit-timeout
      // watchdog which writes Failed) may have terminated this run while
      // we were finishing the last iterator.next(). Respect the already-set
      // terminal state instead of overwriting it with Completed.
      const currentRun = await this.store.getRun(run.id);
      if (AgentRuntime.POST_LOOP_TERMINAL_STATUSES.has(currentRun.status)) {
        await persistPartialOnce();
        await this.finaliseAbortedRun(run.id);
        const latest = await this.store.getRun(run.id);
        return RunBuilder.fromRecord(latest).snapshot();
      }

      const usage = MessageConverter.extractUsage(streamMessages);

      // Append input messages + stream messages to thread (excluding stream_event deltas)
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toAgentMessages(input.input.messages),
        ...MessageConverter.filterForStorage(streamMessages),
      ]);
      messagesPersisted = true;

      await this.store.updateRun(run.id, rb.complete(usage));

      return rb.snapshot();
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        await persistPartialOnce();
        await this.finaliseAbortedRun(run.id);
        const latest = await this.store.getRun(run.id);
        return RunBuilder.fromRecord(latest).snapshot();
      }
      // Non-abort failure (e.g. upstream stream terminated mid-turn). Persist
      // the partial transcript so the thread history keeps the user turn and
      // any committed assistant output instead of silently dropping the run.
      // No-op if the success path already appended (avoids duplicate history).
      await persistPartialOnce();
      try {
        await this.store.updateRun(run.id, rb.fail(err as Error));
      } catch (storeErr) {
        this.logger.error('[AgentRuntime] failed to update run status after syncRun error:', storeErr);
      }
      throw err;
    } finally {
      task.emitter.emit('end');
      resolveTask();
      this.runningTasks.delete(run.id);
    }
  }

  async asyncRun(input: CreateRunInput): Promise<RunObject> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    const abortController = new AbortController();

    // Capture queued snapshot before background task mutates state
    const queuedSnapshot = rb.snapshot();

    // Register in runningTasks before the IIFE starts executing to avoid a race
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>((r) => {
      resolveTask = r;
    });
    const task: RunTaskState = {
      promise: taskPromise,
      abortController,
      committed: false,
      emitter: new EventEmitter(),
    };
    this.runningTasks.set(run.id, task);

    (async () => {
      const streamMessages: AgentMessage[] = [];
      // Persist a turn's transcript to the thread at most once (see syncRun).
      let messagesPersisted = false;
      const persistPartialOnce = async (): Promise<void> => {
        if (!task.committed || messagesPersisted) return;
        messagesPersisted = true;
        await this.persistPartialMessages(threadId, input, streamMessages);
      };
      try {
        await this.store.updateRun(run.id, rb.start());

        for await (const msg of this.executor.execRun(input, abortController.signal)) {
          if (abortController.signal.aborted) {
            await persistPartialOnce();
            await this.finaliseAbortedRun(run.id);
            return;
          }
          streamMessages.push(msg);
          await this.markCommittedIfNeeded(task, msg, streamMessages);
        }

        // TOCTOU: respect any terminal-ish status set by another worker
        // (cancelRun, its commit-timeout watchdog which writes Failed, or
        // an external expiration) instead of overwriting it with Completed.
        const currentRun = await this.store.getRun(run.id);
        if (AgentRuntime.POST_LOOP_TERMINAL_STATUSES.has(currentRun.status)) {
          await persistPartialOnce();
          return;
        }

        const usage = MessageConverter.extractUsage(streamMessages);

        // Append input messages + stream messages to thread (excluding stream_event deltas)
        await this.store.appendMessages(threadId, [
          ...MessageConverter.toAgentMessages(input.input.messages),
          ...MessageConverter.filterForStorage(streamMessages),
        ]);
        messagesPersisted = true;

        await this.store.updateRun(run.id, rb.complete(usage));
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          // Non-abort failure (e.g. upstream stream terminated mid-turn).
          // Persist the partial transcript before marking the run failed so
          // the thread history is not silently dropped. No-op if the success
          // path already appended (avoids duplicate history).
          await persistPartialOnce();
          try {
            const currentRun = await this.store.getRun(run.id);
            if (currentRun.status !== RunStatus.Cancelling && currentRun.status !== RunStatus.Cancelled) {
              await this.store.updateRun(run.id, rb.fail(err as Error));
            }
          } catch (storeErr) {
            this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
          }
        } else {
          await persistPartialOnce();
          await this.finaliseAbortedRun(run.id);
          this.logger.error('[AgentRuntime] execRun error during abort:', err);
        }
      } finally {
        task.emitter.emit('end');
        resolveTask();
        this.runningTasks.delete(run.id);
      }
    })();

    return queuedSnapshot;
  }

  /**
   * Start a streaming run with background execution.
   * The task continues running even if the SSE client disconnects.
   * Events are persisted to a JSONL file for reconnection support.
   */
  async streamRun(input: CreateRunInput, writer: SSEWriter): Promise<void> {
    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // Create event buffer for this run (events persisted to JSONL file)
    if (!existsSync(EVENT_DIR)) {
      mkdirSync(EVENT_DIR, { recursive: true });
    }
    const buffer: RunEventBuffer = {
      filePath: join(EVENT_DIR, `${run.id}.jsonl`),
      lastSeq: 0,
      done: false,
      emitter: new EventEmitter(),
    };
    this.runBuffers.set(run.id, buffer);

    // Emit initial lifecycle event
    this.pushEvent(buffer, 'run_created', { runId: run.id, threadId });

    // Start background execution (not tied to SSE connection)
    const abortController = new AbortController();
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>((r) => {
      resolveTask = r;
    });
    const task: RunTaskState = {
      promise: taskPromise,
      abortController,
      committed: false,
      emitter: new EventEmitter(),
    };
    this.runningTasks.set(run.id, task);

    this.executeStreamBackground(input, run.id, threadId, rb, buffer, task).finally(() => {
      task.emitter.emit('end');
      resolveTask();
      this.runningTasks.delete(run.id);
      this.runBuffers.delete(run.id);
      buffer.emitter.removeAllListeners();
    });

    // Stream events to the current client
    await this.streamEventsToWriter(buffer, writer, 0);
  }

  /**
   * Reconnect to a running or completed run's event stream.
   * Replays events after lastSeq, then continues real-time if still running.
   */
  async getRunStream(runId: string, writer: SSEWriter, lastSeq = 0): Promise<void> {
    const buffer = this.runBuffers.get(runId);
    if (buffer) {
      await this.streamEventsToWriter(buffer, writer, lastSeq);
      return;
    }

    // Task already finished — replay from JSONL file directly
    const filePath = join(EVENT_DIR, `${runId}.jsonl`);
    if (!existsSync(filePath)) {
      throw new AgentNotFoundError(`Run event stream not found: ${runId}`);
    }
    for await (const event of this.readEventsFromFile(filePath, lastSeq)) {
      if (writer.closed) return;
      writer.writeEvent(event.type, event);
    }
    if (!writer.closed) writer.end();
  }

  private pushEvent(buffer: RunEventBuffer, type: string, data: unknown): void {
    const event: StreamEvent = {
      seq: ++buffer.lastSeq,
      type,
      data,
      ts: Date.now(),
    };
    appendFileSync(buffer.filePath, JSON.stringify(event) + '\n');
    buffer.emitter.emit('event', event);
  }

  /**
   * Execute the run in the background, persisting events to JSONL file.
   * AgentMessage objects are passed through directly as event data.
   */
  private async executeStreamBackground(
    input: CreateRunInput,
    runId: string,
    threadId: string,
    rb: RunBuilder,
    buffer: RunEventBuffer,
    task: RunTaskState,
  ): Promise<void> {
    const abortController = task.abortController;
    const streamMessages: AgentMessage[] = [];
    // Persist a turn's transcript to the thread at most once (see syncRun).
    let messagesPersisted = false;
    const persistPartialOnce = async (): Promise<void> => {
      if (!task.committed || messagesPersisted) return;
      messagesPersisted = true;
      await this.persistPartialMessages(threadId, input, streamMessages);
    };
    try {
      await this.store.updateRun(runId, rb.start());

      for await (const msg of this.executor.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) {
          await persistPartialOnce();
          await this.finaliseAbortedRun(runId);
          this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
          return;
        }

        streamMessages.push(msg);

        // Pass through SDK message directly as event data
        const eventType = msg.type || 'message';
        this.pushEvent(buffer, eventType, msg);

        await this.markCommittedIfNeeded(task, msg, streamMessages);
      }

      // TOCTOU: respect any terminal-ish status set by another worker
      // (cancelRun, its commit-timeout watchdog which writes Failed, or
      // an external expiration) instead of overwriting it with Completed.
      const currentRun = await this.store.getRun(runId);
      if (AgentRuntime.POST_LOOP_TERMINAL_STATUSES.has(currentRun.status)) {
        await persistPartialOnce();
        this.pushEvent(buffer, 'error', { message: currentRun.status, runId });
        return;
      }

      // Persist to store (excluding stream_event deltas)
      const usage = MessageConverter.extractUsage(streamMessages);
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toAgentMessages(input.input.messages),
        ...MessageConverter.filterForStorage(streamMessages),
      ]);
      messagesPersisted = true;
      await this.store.updateRun(runId, rb.complete(usage));

      this.pushEvent(buffer, 'done', { result: 'success', runId });
    } catch (err: unknown) {
      if (!abortController.signal.aborted) {
        // Non-abort failure (e.g. upstream stream terminated mid-turn).
        // Persist the partial transcript before marking the run failed so the
        // thread history is not silently dropped. No-op if the success path
        // already appended (avoids duplicate history).
        await persistPartialOnce();
        try {
          const currentRun = await this.store.getRun(runId);
          if (currentRun.status !== RunStatus.Cancelling && currentRun.status !== RunStatus.Cancelled) {
            await this.store.updateRun(runId, rb.fail(err as Error));
          }
        } catch (storeErr) {
          this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
        }
        this.pushEvent(buffer, 'error', { message: (err as Error).message, runId });
      } else {
        await persistPartialOnce();
        await this.finaliseAbortedRun(runId);
        this.logger.error('[AgentRuntime] execRun error during abort:', err);
        this.pushEvent(buffer, 'error', { message: 'cancelled', runId });
      }
    } finally {
      buffer.done = true;
      buffer.emitter.emit('event');
    }
  }

  /**
   * Flip the task's `committed` flag the first time the executor's current
   * message indicates its session has been persisted to storage. Uses the
   * executor's `isSessionCommitted` hook when available, otherwise a default
   * heuristic where any message with `type !== 'system'` counts as committed
   * (the Claude Code SDK writes the jsonl around the first non-system event).
   */
  private async markCommittedIfNeeded(task: RunTaskState, msg: AgentMessage, history: AgentMessage[]): Promise<void> {
    if (task.committed) return;
    let committed: boolean;
    try {
      committed =
        typeof this.executor.isSessionCommitted === 'function'
          ? await this.executor.isSessionCommitted(msg, history)
          : msg.type !== 'system';
    } catch (err) {
      this.logger.error('[AgentRuntime] isSessionCommitted threw, treating as not committed:', err);
      committed = false;
    }
    if (committed) {
      task.committed = true;
      task.emitter.emit('commit');
    }
  }

  /**
   * Wait until the task reports that its session is committed, or the task
   * finishes on its own, or the timeout elapses. Rejects with
   * AgentTimeoutError on timeout. Resolves without error when the task ends
   * before committing — in that case the caller should re-read the run's
   * terminal status rather than trying to cancel further.
   */
  private waitForCommitted(task: RunTaskState, timeoutMs: number): Promise<void> {
    if (task.committed) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      // Handlers need to reference each other (cleanup must off() all of
      // commit / end / timer), which would force a forward reference if the
      // arrow functions referred to each other by name. Stash them on a
      // shared container so cleanup can read them by property access and the
      // source order stays linear.
      const refs: {
        timer?: ReturnType<typeof globalThis.setTimeout>;
        onCommit?: () => void;
        onEnd?: () => void;
      } = {};
      const cleanup = (): void => {
        if (refs.timer) clearTimeout(refs.timer);
        if (refs.onCommit) task.emitter.off('commit', refs.onCommit);
        if (refs.onEnd) task.emitter.off('end', refs.onEnd);
      };
      refs.onCommit = () => {
        cleanup();
        resolve();
      };
      refs.onEnd = () => {
        cleanup();
        resolve();
      };
      refs.timer = globalThis.setTimeout(() => {
        cleanup();
        reject(
          new AgentTimeoutError(`Timed out waiting ${timeoutMs}ms for executor session to be committed before cancel`),
        );
      }, timeoutMs);
      task.emitter.once('commit', refs.onCommit);
      task.emitter.once('end', refs.onEnd);
    });
  }

  /**
   * Persist input + collected stream messages to the thread when a run ends
   * on a non-success path — either an abort/cancel, or a mid-turn failure
   * (e.g. the upstream stream is terminated). Keeping the thread in sync with
   * any partial state that the executor has already written (e.g. Claude CLI
   * session file) is what allows subsequent resume requests to continue from a
   * consistent history instead of diverging and failing at executor startup,
   * and prevents a failed turn from vanishing entirely from thread history.
   *
   * Callers must check `task.committed` before invoking this; if the
   * executor never reached a committed state the thread should be left
   * untouched so the next run starts fresh instead of trying to resume a
   * session that was never created on disk.
   *
   * Errors are swallowed here so a store failure cannot mask the original
   * abort/failure or prevent the run status from being finalised.
   */
  private async persistPartialMessages(
    threadId: string,
    input: CreateRunInput,
    streamMessages: AgentMessage[],
  ): Promise<void> {
    try {
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toAgentMessages(input.input.messages),
        ...MessageConverter.filterForStorage(streamMessages),
      ]);
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to persist messages on abort:', err);
    }
  }

  /**
   * Push an aborted run to a terminal `cancelled` state when nobody else
   * will. Abort can be driven either by `cancelRun` — which already owns
   * the `in_progress → cancelling → cancelled` transition — or by an
   * external `AbortSignal` / `destroy()`, where the run would otherwise
   * stay stuck in `in_progress` forever.
   *
   * Behaviour:
   * - terminal status (completed/failed/cancelled/expired): no-op.
   * - `cancelling`: no-op, let `cancelRun` finish the transition.
   * - `in_progress` / `queued`: write `cancelling` then `cancelled`.
   *
   * Errors are swallowed so a store failure cannot mask the abort.
   */
  private async finaliseAbortedRun(runId: string): Promise<void> {
    try {
      const current = await this.store.getRun(runId);
      if (AgentRuntime.TERMINAL_RUN_STATUSES.has(current.status)) return;
      if (current.status === RunStatus.Cancelling) return;

      const rb = RunBuilder.fromRecord(current);
      await this.store.updateRun(runId, rb.cancelling());
      await this.store.updateRun(runId, rb.cancel());
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to finalise aborted run:', err);
    }
  }

  private async *readEventsFromFile(filePath: string, afterSeq: number): AsyncGenerator<StreamEvent> {
    if (!existsSync(filePath)) return;
    const rl = createInterface({ input: createReadStream(filePath) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StreamEvent;
        if (event.seq > afterSeq) {
          yield event;
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  private async streamEventsToWriter(buffer: RunEventBuffer, writer: SSEWriter, lastSeq: number): Promise<void> {
    // Phase 1: Replay from JSONL file
    let lastWrittenSeq = lastSeq;
    for await (const event of this.readEventsFromFile(buffer.filePath, lastSeq)) {
      if (writer.closed) return;
      writer.writeEvent(event.type, event);
      lastWrittenSeq = event.seq;
    }

    if (buffer.done) {
      if (!writer.closed) writer.end();
      return;
    }

    // Phase 2: Real-time events via EventEmitter + heartbeat
    const queue: StreamEvent[] = [];
    let waitResolve: (() => void) | null = null;

    function onEvent(event?: StreamEvent): void {
      if (event) queue.push(event);
      waitResolve?.();
    }

    buffer.emitter.on('event', onEvent);

    try {
      // Catch-up: drain any events that arrived during Phase 1 file read
      for await (const event of this.readEventsFromFile(buffer.filePath, lastWrittenSeq)) {
        if (writer.closed) return;
        if (event.seq > lastWrittenSeq) {
          writer.writeEvent(event.type, event);
          lastWrittenSeq = event.seq;
        }
      }

      const waitForEvent = () =>
        new Promise<'event' | 'heartbeat'>((resolve) => {
          waitResolve = () => resolve('event');
          setTimeout(() => resolve('heartbeat'), HEARTBEAT_INTERVAL_MS);
        });

      while (!buffer.done || queue.length > 0) {
        while (queue.length > 0) {
          const event = queue.shift()!;
          if (event.seq > lastWrittenSeq) {
            if (writer.closed) return;
            writer.writeEvent(event.type, event);
            lastWrittenSeq = event.seq;
          }
        }

        if (buffer.done) break;
        if (writer.closed) return;

        const reason = await waitForEvent();
        waitResolve = null;
        if (reason === 'heartbeat' && queue.length === 0 && !buffer.done) {
          if (writer.closed) return;
          writer.writeComment('keepalive');
        }
      }
    } finally {
      buffer.emitter.off('event', onEvent);
    }

    if (!writer.closed) writer.end();
  }

  async getRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    return RunBuilder.fromRecord(run).snapshot();
  }

  /**
   * Resolve the most recent run created on a thread. Returns `{ runId: null }`
   * when the thread exists but has no recorded run (e.g. threads created
   * before run tracking, or with no runs yet). Throws AgentNotFoundError when
   * the thread does not exist.
   */
  async getLatestRunId(threadId: string): Promise<{ threadId: string; runId: string | null }> {
    const runId = await this.store.getLatestRunId(threadId);
    return { threadId, runId };
  }

  /**
   * Cancel a running task. The call blocks until either (a) the executor
   * reports its session is safely committed to storage, and the task has
   * been aborted and the thread persisted, or (b) the commit watchdog times
   * out, in which case the run is marked `failed` (not `cancelled`) and
   * AgentTimeoutError is thrown to the caller.
   *
   * The hold is there to guarantee that whatever user input the thread
   * records on abort is also present in the executor's own persistent
   * session (e.g. Claude Code SDK jsonl), so a subsequent resume request
   * on the same thread doesn't diverge from a session that was never
   * actually written.
   */
  async cancelRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new AgentConflictError(`Cannot cancel run with status '${run.status}'`);
    }

    const rb = RunBuilder.fromRecord(run);
    await this.store.updateRun(runId, rb.cancelling());

    const task = this.runningTasks.get(runId);
    if (task) {
      if (!task.committed) {
        this.logger.info(
          '[AgentRuntime] cancelRun %s holding up to %dms for executor session to commit',
          runId,
          this.cancelCommitTimeoutMs,
        );
        try {
          await this.waitForCommitted(task, this.cancelCommitTimeoutMs);
        } catch (err) {
          // Commit watchdog timed out. Mark the run as failed *before*
          // aborting so the execution path's finaliseAbortedRun sees a
          // terminal status and skips the cancelled transition. The thread
          // is left untouched because task.committed is still false.
          this.logger.error(
            '[AgentRuntime] cancelRun %s timed out after %dms waiting for executor to commit; marking run failed and leaving thread untouched',
            runId,
            this.cancelCommitTimeoutMs,
          );
          try {
            await this.store.updateRun(runId, rb.fail(err as Error));
          } catch (storeErr) {
            this.logger.error('[AgentRuntime] failed to mark run failed after cancel timeout:', storeErr);
          }
          task.abortController.abort();
          await task.promise.catch(() => {
            /* ignore */
          });
          throw err;
        }
      }
      task.abortController.abort();
      await task.promise.catch(() => {
        /* ignore */
      });
    }

    const freshRun = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(freshRun.status)) {
      return RunBuilder.fromRecord(freshRun).snapshot();
    }

    try {
      await this.store.updateRun(runId, rb.cancel());
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to write cancelled state after cancelling:', err);
      const fallback = await this.store.getRun(runId);
      return RunBuilder.fromRecord(fallback).snapshot();
    }

    return rb.snapshot();
  }

  async waitForPendingTasks(): Promise<void> {
    if (this.runningTasks.size) {
      const pending = Array.from(this.runningTasks.values()).map((t) => t.promise);
      await Promise.allSettled(pending);
    }
  }

  async destroy(): Promise<void> {
    for (const task of this.runningTasks.values()) {
      task.abortController.abort();
    }
    await this.waitForPendingTasks();

    for (const buffer of this.runBuffers.values()) {
      buffer.emitter.removeAllListeners();
    }
    this.runBuffers.clear();

    if (this.store.destroy) {
      await this.store.destroy();
    }
  }

  static create(options: AgentRuntimeOptions): AgentRuntime {
    return new AgentRuntime(options);
  }
}
