import type {
  CreateRunInput,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  MessageObject,
  MessageDeltaObject,
  MessageContentBlock,
  AgentStreamMessage,
} from '@eggjs/controller-decorator';
import { RunStatus, AgentSSEEvent, AgentObjectType, MessageRole, MessageStatus } from '@eggjs/controller-decorator';

import type { AgentStore } from './AgentStore.ts';
import { AgentConflictError } from './errors.ts';
import { toContentBlocks, extractFromStreamMessages, toInputMessageObjects } from './MessageConverter.ts';
import { RunBuilder } from './RunBuilder.ts';
import type { RunUsage } from './RunBuilder.ts';
import type { SSEWriter } from './SSEWriter.ts';
import { nowUnix, newMsgId } from './utils.ts';

export const AGENT_RUNTIME: unique symbol = Symbol('agentRuntime');

/**
 * The host interface — only requires execRun so the runtime can delegate
 * execution back through the controller's prototype chain (AOP/mock friendly).
 */
export interface AgentControllerHost {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage>;
}

export interface AgentRuntimeLogger {
  error(...args: unknown[]): void;
}

export interface AgentRuntimeOptions {
  host: AgentControllerHost;
  store: AgentStore;
  logger: AgentRuntimeLogger;
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
  private host: AgentControllerHost;
  private logger: AgentRuntimeLogger;

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

  async syncRun(input: CreateRunInput): Promise<RunObject> {
    let threadId = input.thread_id;
    if (!threadId) {
      const thread = await this.store.createThread();
      threadId = thread.id;
      input = { ...input, thread_id: threadId };
    }

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    try {
      await this.store.updateRun(run.id, rb.start());

      const streamMessages: AgentStreamMessage[] = [];
      for await (const msg of this.host.execRun(input)) {
        streamMessages.push(msg);
      }
      const { output, usage } = extractFromStreamMessages(streamMessages, run.id);

      await this.store.updateRun(run.id, rb.complete(output, usage));

      await this.store.appendMessages(threadId, [...toInputMessageObjects(input.input.messages, threadId), ...output]);

      return rb.snapshot();
    } catch (err: unknown) {
      await this.store.updateRun(run.id, rb.fail(err as Error));
      throw err;
    }
  }

  async asyncRun(input: CreateRunInput): Promise<RunObject> {
    let threadId = input.thread_id;
    if (!threadId) {
      const thread = await this.store.createThread();
      threadId = thread.id;
      input = { ...input, thread_id: threadId };
    }

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

        const { output, usage } = extractFromStreamMessages(streamMessages, run.id);

        await this.store.updateRun(run.id, rb.complete(output, usage));

        await this.store.appendMessages(threadId!, [
          ...toInputMessageObjects(input.input.messages, threadId),
          ...output,
        ]);
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          try {
            await this.store.updateRun(run.id, rb.fail(err as Error));
          } catch (storeErr) {
            this.logger.error('[AgentController] failed to update run status after error:', storeErr);
          }
        } else {
          this.logger.error('[AgentController] execRun error during abort:', err);
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

    let threadId = input.thread_id;
    if (!threadId) {
      const thread = await this.store.createThread();
      threadId = thread.id;
      input = { ...input, thread_id: threadId };
    }

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);
    const rb = RunBuilder.create(run, threadId);

    // event: thread.run.created
    writer.writeEvent(AgentSSEEvent.ThreadRunCreated, rb.snapshot());

    // event: thread.run.in_progress
    await this.store.updateRun(run.id, rb.start());
    writer.writeEvent(AgentSSEEvent.ThreadRunInProgress, rb.snapshot());

    const msgId = newMsgId();

    // event: thread.message.created
    const msgObj: MessageObject = {
      id: msgId,
      object: AgentObjectType.ThreadMessage,
      created_at: nowUnix(),
      run_id: run.id,
      role: MessageRole.Assistant,
      status: MessageStatus.InProgress,
      content: [],
    };
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
          await this.store.updateRun(run.id, rb.cancel());
        } catch {
          // Ignore store update failure during abort
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
      const output: MessageObject[] = content.length > 0 ? [msgObj] : [];
      await this.store.updateRun(run.id, rb.complete(output, usage));
      await this.store.appendMessages(threadId!, [...toInputMessageObjects(input.input.messages, threadId), ...output]);

      // event: thread.run.completed
      writer.writeEvent(AgentSSEEvent.ThreadRunCompleted, rb.snapshot());
    } catch (err: unknown) {
      try {
        await this.store.updateRun(run.id, rb.fail(err as Error));
      } catch (storeErr) {
        this.logger.error('[AgentController] failed to update run status after error:', storeErr);
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
        const contentBlocks = toContentBlocks(msg.message);
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
    return {
      id: run.id,
      object: AgentObjectType.ThreadRun,
      created_at: run.created_at,
      thread_id: run.thread_id,
      status: run.status,
      last_error: run.last_error,
      started_at: run.started_at,
      completed_at: run.completed_at,
      cancelled_at: run.cancelled_at,
      failed_at: run.failed_at,
      usage: run.usage,
      output: run.output,
      config: run.config,
      metadata: run.metadata,
    };
  }

  async cancelRun(runId: string): Promise<RunObject> {
    // Abort running task first to prevent it from writing completed status
    const task = this.runningTasks.get(runId);
    if (task) {
      task.abortController.abort();
      // Wait for the background task to finish so it won't race with our update
      await task.promise.catch(() => {
        /* ignore */
      });
    }

    // Re-read run status after background task has settled
    const run = await this.store.getRun(runId);
    if (AgentRuntime.TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new AgentConflictError(`Cannot cancel run with status '${run.status}'`);
    }

    const rb = RunBuilder.create(run, run.thread_id ?? '');
    await this.store.updateRun(runId, rb.cancel());

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
}

/** Factory function — avoids the spread-arg type issue with dynamic delegation. */
export function createAgentRuntime(options: AgentRuntimeOptions): AgentRuntime {
  return new AgentRuntime(options);
}
