import type {
  CreateRunInput,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  MessageObject,
  MessageDeltaObject,
  MessageContentBlock,
  AgentStreamMessage,
  AgentStore,
} from '@eggjs/tegg-types/agent-runtime';
import { RunStatus, AgentSSEEvent, AgentObjectType, MessageStatus } from '@eggjs/tegg-types/agent-runtime';
import { AgentConflictError } from '@eggjs/tegg-types/agent-runtime';
import type { EggLogger } from 'egg-logger';

import { newMsgId } from './AgentStoreUtils.ts';
import { MessageConverter } from './MessageConverter.ts';
import { RunBuilder } from './RunBuilder.ts';
import type { RunUsage } from './RunBuilder.ts';
import type { SSEWriter } from './SSEWriter.ts';

export const AGENT_RUNTIME: unique symbol = Symbol('agentRuntime');

/**
 * The executor interface — only requires execRun so the runtime can delegate
 * execution back through the controller's prototype chain (AOP/mock friendly).
 */
export interface AgentExecutor {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage>;
}

export interface AgentRuntimeOptions {
  host: AgentExecutor;
  store: AgentStore;
  logger: EggLogger;
}

export class AgentRuntime {
  private static readonly TERMINAL_RUN_STATUSES = new Set<RunStatus>([
    RunStatus.Completed,
    RunStatus.Failed,
    RunStatus.Cancelled,
    RunStatus.Expired,
  ]);

  private store: AgentStore;
  private runningTasks: Map<string, { promise: Promise<void>; abortController: AbortController }>;
  private host: AgentExecutor;
  private logger: EggLogger;

  constructor(options: AgentRuntimeOptions) {
    this.host = options.host;
    this.store = options.store;
    if (!options.logger) {
      throw new Error('AgentRuntimeOptions.logger is required');
    }
    this.logger = options.logger;
    this.runningTasks = new Map();
  }

  async createThread(): Promise<ThreadObject> {
    const thread = await this.store.createThread();
    return {
      id: thread.id,
      object: AgentObjectType.Thread,
      created_at: thread.created_at,
      metadata: thread.metadata ?? {},
    };
  }

  async getThread(threadId: string): Promise<ThreadObjectWithMessages> {
    const thread = await this.store.getThread(threadId);
    return {
      id: thread.id,
      object: AgentObjectType.Thread,
      created_at: thread.created_at,
      metadata: thread.metadata ?? {},
      messages: thread.messages,
    };
  }

  private async ensureThread(input: CreateRunInput): Promise<{ threadId: string; input: CreateRunInput }> {
    if (input.thread_id) {
      return { threadId: input.thread_id, input };
    }
    const thread = await this.store.createThread();
    return { threadId: thread.id, input: { ...input, thread_id: thread.id } };
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
    // Use a real pending promise (not Promise.resolve()) so cancelRun's
    // `await task.promise` blocks until syncRun's try/finally completes.
    let resolveTask!: () => void;
    const taskPromise = new Promise<void>((r) => {
      resolveTask = r;
    });
    this.runningTasks.set(run.id, { promise: taskPromise, abortController });

    try {
      await this.store.updateRun(run.id, rb.start());

      const streamMessages: AgentStreamMessage[] = [];
      for await (const msg of this.host.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) break;
        streamMessages.push(msg);
      }

      if (abortController.signal.aborted) {
        // Run was cancelled externally — re-read store for the latest state
        const latest = await this.store.getRun(run.id);
        return RunBuilder.create(latest, latest.thread_id ?? '').snapshot();
      }

      const { output, usage } = MessageConverter.extractFromStreamMessages(streamMessages, run.id);

      // TODO: updateRun + appendMessages are not atomic — if updateRun succeeds but
      // appendMessages fails, the run shows completed but thread history is incomplete.
      // Consider reordering (append first, then complete) or adding an aggregate store method.
      await this.store.updateRun(run.id, rb.complete(output, usage));

      await this.store.appendMessages(threadId, [
        ...MessageConverter.toInputMessageObjects(input.input.messages, threadId),
        ...output,
      ]);

      return rb.snapshot();
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        // Cancelled — re-read store for the latest state
        const latest = await this.store.getRun(run.id);
        return RunBuilder.create(latest, latest.thread_id ?? '').snapshot();
      }
      try {
        await this.store.updateRun(run.id, rb.fail(err as Error));
      } catch (storeErr) {
        this.logger.error('[AgentRuntime] failed to update run status after syncRun error:', storeErr);
      }
      throw err;
    } finally {
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

    const promise = (async () => {
      try {
        await this.store.updateRun(run.id, rb.start());

        const streamMessages: AgentStreamMessage[] = [];
        for await (const msg of this.host.execRun(input, abortController.signal)) {
          if (abortController.signal.aborted) break;
          streamMessages.push(msg);
        }

        if (abortController.signal.aborted) return;

        // Check if another worker has cancelled this run before writing final state
        const currentRun = await this.store.getRun(run.id);
        if (currentRun.status === RunStatus.Cancelling || currentRun.status === RunStatus.Cancelled) {
          return;
        }

        const { output, usage } = MessageConverter.extractFromStreamMessages(streamMessages, run.id);

        // TODO: same atomicity concern as syncRun — see comment there
        await this.store.updateRun(run.id, rb.complete(output, usage));

        await this.store.appendMessages(threadId, [
          ...MessageConverter.toInputMessageObjects(input.input.messages, threadId),
          ...output,
        ]);
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          // Check store before writing failed state — another worker may have cancelled
          try {
            const currentRun = await this.store.getRun(run.id);
            if (currentRun.status !== RunStatus.Cancelling && currentRun.status !== RunStatus.Cancelled) {
              await this.store.updateRun(run.id, rb.fail(err as Error));
            }
          } catch (storeErr) {
            // TODO: need a background expiry mechanism to clean up runs stuck in non-terminal states
            // (e.g. in_progress or cancelling) when store writes fail persistently.
            this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
          }
        } else {
          this.logger.error('[AgentRuntime] execRun error during abort:', err);
        }
      } finally {
        this.runningTasks.delete(run.id);
      }
    })();

    this.runningTasks.set(run.id, { promise, abortController });

    return queuedSnapshot;
  }

  async streamRun(input: CreateRunInput, writer: SSEWriter): Promise<void> {
    // Abort execRun generator when client disconnects
    const abortController = new AbortController();
    writer.onClose(() => abortController.abort());

    const { threadId, input: resolvedInput } = await this.ensureThread(input);
    input = resolvedInput;

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // event: thread.run.created
    writer.writeEvent(AgentSSEEvent.ThreadRunCreated, rb.snapshot());

    // event: thread.run.in_progress
    await this.store.updateRun(run.id, rb.start());
    writer.writeEvent(AgentSSEEvent.ThreadRunInProgress, rb.snapshot());

    const msgId = newMsgId();

    // event: thread.message.created
    const msgObj = MessageConverter.createStreamMessage(msgId, run.id);
    writer.writeEvent(AgentSSEEvent.ThreadMessageCreated, msgObj);

    try {
      const { content, usage, aborted } = await this.consumeStreamMessages(
        input,
        abortController.signal,
        writer,
        msgId,
      );

      if (aborted) {
        try {
          await this.store.updateRun(run.id, rb.cancelling());
        } catch (storeErr) {
          this.logger.error('[AgentRuntime] failed to write cancelling status during stream abort:', storeErr);
        }
        try {
          await this.store.updateRun(run.id, rb.cancel());
        } catch (storeErr) {
          this.logger.error('[AgentRuntime] failed to write cancelled status during stream abort:', storeErr);
        }
        if (!writer.closed) {
          writer.writeEvent(AgentSSEEvent.ThreadRunCancelled, rb.snapshot());
        }
        return;
      }

      // event: thread.message.completed
      msgObj.status = MessageStatus.Completed;
      msgObj.content = content;
      writer.writeEvent(AgentSSEEvent.ThreadMessageCompleted, msgObj);

      // Persist and emit completion
      // TODO: same atomicity concern as syncRun — see comment there
      const output: MessageObject[] = content.length > 0 ? [msgObj] : [];
      await this.store.updateRun(run.id, rb.complete(output, usage));
      await this.store.appendMessages(threadId, [
        ...MessageConverter.toInputMessageObjects(input.input.messages, threadId),
        ...output,
      ]);

      // event: thread.run.completed
      writer.writeEvent(AgentSSEEvent.ThreadRunCompleted, rb.snapshot());
    } catch (err: unknown) {
      try {
        await this.store.updateRun(run.id, rb.fail(err as Error));
      } catch (storeErr) {
        this.logger.error('[AgentRuntime] failed to update run status after error:', storeErr);
      }

      // event: thread.run.failed
      if (!writer.closed) {
        writer.writeEvent(AgentSSEEvent.ThreadRunFailed, rb.snapshot());
      }
    } finally {
      // event: done
      if (!writer.closed) {
        writer.writeEvent(AgentSSEEvent.Done, '[DONE]');
        writer.end();
      }
    }
  }

  /**
   * Consume the execRun async generator, emitting SSE message.delta events
   * for each chunk and accumulating content blocks and token usage.
   */
  private async consumeStreamMessages(
    input: CreateRunInput,
    signal: AbortSignal,
    writer: SSEWriter,
    msgId: string,
  ): Promise<{ content: MessageContentBlock[]; usage?: RunUsage; aborted: boolean }> {
    const content: MessageContentBlock[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let hasUsage = false;

    for await (const msg of this.host.execRun(input, signal)) {
      if (signal.aborted) break;
      if (msg.message) {
        const contentBlocks = MessageConverter.toContentBlocks(msg.message);
        content.push(...contentBlocks);

        // event: thread.message.delta
        const delta: MessageDeltaObject = {
          id: msgId,
          object: AgentObjectType.ThreadMessageDelta,
          delta: { content: contentBlocks },
        };
        writer.writeEvent(AgentSSEEvent.ThreadMessageDelta, delta);
      }
      if (msg.usage) {
        hasUsage = true;
        promptTokens += msg.usage.prompt_tokens ?? 0;
        completionTokens += msg.usage.completion_tokens ?? 0;
      }
    }

    return {
      content,
      usage: hasUsage ? { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens } : undefined,
      aborted: signal.aborted,
    };
  }

  async getRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    return RunBuilder.create(run, run.thread_id ?? '').snapshot();
  }

  async cancelRun(runId: string): Promise<RunObject> {
    // 1. Check current status — reject if already terminal
    const run = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new AgentConflictError(`Cannot cancel run with status '${run.status}'`);
    }

    const rb = RunBuilder.create(run, run.thread_id ?? '');

    // 2. Write "cancelling" to store first — visible to all workers
    await this.store.updateRun(runId, rb.cancelling());

    // 3. If the task is running locally, abort it for immediate effect
    const task = this.runningTasks.get(runId);
    if (task) {
      task.abortController.abort();
      await task.promise.catch(() => {
        /* ignore */
      });
    }

    // 4. Re-read store to mitigate TOCTOU: if the run completed/failed between
    //    steps 2 and 4, do not overwrite the terminal state.
    // TODO: For full atomicity, use CAS / ETag-based conditional writes.
    const freshRun = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(freshRun.status)) {
      // Run reached a terminal state while we were cancelling — return as-is
      return RunBuilder.create(freshRun, freshRun.thread_id ?? '').snapshot();
    }

    // 5. Transition to final "cancelled" state
    try {
      await this.store.updateRun(runId, rb.cancel());
    } catch (err) {
      this.logger.error('[AgentRuntime] failed to write cancelled state after cancelling:', err);
      // Return best-effort snapshot from store
      const fallback = await this.store.getRun(runId);
      return RunBuilder.create(fallback, fallback.thread_id ?? '').snapshot();
    }

    return rb.snapshot();
  }

  /** Wait for all in-flight background tasks to complete naturally (without aborting). */
  async waitForPendingTasks(): Promise<void> {
    if (this.runningTasks.size) {
      const pending = Array.from(this.runningTasks.values()).map((t) => t.promise);
      await Promise.allSettled(pending);
    }
  }

  async destroy(): Promise<void> {
    // Abort all in-flight background tasks, then wait for them to settle
    for (const task of this.runningTasks.values()) {
      task.abortController.abort();
    }
    await this.waitForPendingTasks();

    // Destroy store
    if (this.store.destroy) {
      await this.store.destroy();
    }
  }

  /** Factory method — avoids the spread-arg type issue with dynamic delegation. */
  static create(options: AgentRuntimeOptions): AgentRuntime {
    return new AgentRuntime(options);
  }
}
