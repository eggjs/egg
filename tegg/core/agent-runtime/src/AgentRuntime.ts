import type {
  CreateRunInput,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  MessageObject,
  MessageDeltaObject,
  AgentStreamMessage,
} from '@eggjs/controller-decorator';
import { RunStatus, AgentSSEEvent } from '@eggjs/controller-decorator';

import type { AgentStore } from './AgentStore.ts';
import { AgentConflictError } from './errors.ts';
import { toContentBlocks, extractFromStreamMessages, toInputMessageObjects } from './MessageConverter.ts';
import { RunBuilder } from './RunBuilder.ts';
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
  logger?: AgentRuntimeLogger;
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
    this.logger = options.logger ?? console;
    this.runningTasks = new Map();
  }

  async createThread(): Promise<ThreadObject> {
    const thread = await this.store.createThread();
    return {
      id: thread.id,
      object: 'thread',
      created_at: thread.created_at,
      metadata: thread.metadata ?? {},
    };
  }

  async getThread(threadId: string): Promise<ThreadObjectWithMessages> {
    const thread = await this.store.getThread(threadId);
    return {
      id: thread.id,
      object: 'thread',
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
      const started = rb.start();
      await this.store.updateRun(run.id, { status: started.status, started_at: started.started_at });

      const streamMessages: AgentStreamMessage[] = [];
      for await (const msg of this.host.execRun(input)) {
        streamMessages.push(msg);
      }
      const { output, usage } = extractFromStreamMessages(streamMessages, run.id);

      const completed = rb.complete(output, usage);
      await this.store.updateRun(run.id, {
        status: completed.status,
        output,
        usage,
        completed_at: completed.completed_at,
      });

      await this.store.appendMessages(threadId, [...toInputMessageObjects(input.input.messages, threadId), ...output]);

      return completed;
    } catch (err: any) {
      const failed = rb.fail(err);
      await this.store.updateRun(run.id, {
        status: failed.status,
        last_error: failed.last_error,
        failed_at: failed.failed_at,
      });
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
        const started = rb.start();
        await this.store.updateRun(run.id, { status: started.status, started_at: started.started_at });

        const streamMessages: AgentStreamMessage[] = [];
        for await (const msg of this.host.execRun(input, abortController.signal)) {
          if (abortController.signal.aborted) break;
          streamMessages.push(msg);
        }

        if (abortController.signal.aborted) return;

        const { output, usage } = extractFromStreamMessages(streamMessages, run.id);

        const completed = rb.complete(output, usage);
        await this.store.updateRun(run.id, {
          status: completed.status,
          output,
          usage,
          completed_at: completed.completed_at,
        });

        await this.store.appendMessages(threadId!, [
          ...toInputMessageObjects(input.input.messages, threadId),
          ...output,
        ]);
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          try {
            const failed = rb.fail(err);
            await this.store.updateRun(run.id, {
              status: failed.status,
              last_error: failed.last_error,
              failed_at: failed.failed_at,
            });
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
    const started = rb.start();
    await this.store.updateRun(run.id, { status: started.status, started_at: started.started_at });
    writer.writeEvent(AgentSSEEvent.ThreadRunInProgress, started);

    const msgId = newMsgId();
    const accumulatedContent: MessageObject['content'] = [];

    // event: thread.message.created
    const msgObj: MessageObject = {
      id: msgId,
      object: 'thread.message',
      created_at: nowUnix(),
      run_id: run.id,
      role: 'assistant',
      status: 'in_progress',
      content: [],
    };
    writer.writeEvent(AgentSSEEvent.ThreadMessageCreated, msgObj);

    let promptTokens = 0;
    let completionTokens = 0;
    let hasUsage = false;

    try {
      for await (const msg of this.host.execRun(input, abortController.signal)) {
        if (abortController.signal.aborted) break;
        if (msg.message) {
          const contentBlocks = toContentBlocks(msg.message);
          accumulatedContent.push(...contentBlocks);

          // event: thread.message.delta
          const delta: MessageDeltaObject = {
            id: msgId,
            object: 'thread.message.delta',
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

      // If client disconnected / abort signaled, emit cancelled and return
      if (abortController.signal.aborted) {
        const cancelled = rb.cancel();
        try {
          await this.store.updateRun(run.id, { status: cancelled.status, cancelled_at: cancelled.cancelled_at });
        } catch {
          // Ignore store update failure during abort
        }
        if (!writer.closed) {
          writer.writeEvent(AgentSSEEvent.ThreadRunCancelled, cancelled);
        }
        return;
      }

      // event: thread.message.completed
      msgObj.status = 'completed';
      msgObj.content = accumulatedContent;
      writer.writeEvent(AgentSSEEvent.ThreadMessageCompleted, msgObj);

      // Build final output
      const output: MessageObject[] = accumulatedContent.length > 0 ? [msgObj] : [];
      let usage: RunObject['usage'];
      if (hasUsage) {
        usage = {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        };
      }

      const completed = rb.complete(output, usage);
      await this.store.updateRun(run.id, {
        status: completed.status,
        output,
        usage,
        completed_at: completed.completed_at,
      });

      await this.store.appendMessages(threadId!, [...toInputMessageObjects(input.input.messages, threadId), ...output]);

      // event: thread.run.completed
      writer.writeEvent(AgentSSEEvent.ThreadRunCompleted, completed);
    } catch (err: any) {
      const failed = rb.fail(err);
      try {
        await this.store.updateRun(run.id, {
          status: failed.status,
          last_error: failed.last_error,
          failed_at: failed.failed_at,
        });
      } catch (storeErr) {
        this.logger.error('[AgentController] failed to update run status after error:', storeErr);
      }

      // event: thread.run.failed
      if (!writer.closed) {
        writer.writeEvent(AgentSSEEvent.ThreadRunFailed, failed);
      }
    } finally {
      // event: done
      if (!writer.closed) {
        writer.writeEvent(AgentSSEEvent.Done, '[DONE]');
        writer.end();
      }
    }
  }

  async getRun(runId: string): Promise<RunObject> {
    const run = await this.store.getRun(runId);
    return {
      id: run.id,
      object: 'thread.run',
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
    const cancelled = rb.cancel();
    await this.store.updateRun(runId, {
      status: cancelled.status,
      cancelled_at: cancelled.cancelled_at,
    });

    return cancelled;
  }

  async destroy(): Promise<void> {
    // Wait for in-flight background tasks
    if (this.runningTasks.size) {
      const pending = Array.from(this.runningTasks.values()).map((t) => t.promise);
      await Promise.allSettled(pending);
    }

    // Destroy store
    if (this.store.destroy) {
      await this.store.destroy();
    }
  }
}
