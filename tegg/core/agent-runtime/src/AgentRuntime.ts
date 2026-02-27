import type {
  CreateRunInput,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  MessageObject,
  MessageContentBlock,
  MessageDeltaObject,
  AgentStreamMessage,
} from '@eggjs/controller-decorator';
import { ContextHandler } from '@eggjs/tegg-runtime';

import type { AgentStore } from './AgentStore.ts';
import { AgentConflictError } from './errors.ts';
import { nowUnix, newMsgId } from './utils.ts';

// Canonical definition in @eggjs/module-common (tegg/plugin/common).
// Re-declared here to avoid a core→plugin dependency.
const EGG_CONTEXT: symbol = Symbol.for('context#eggContext');

export const AGENT_RUNTIME: unique symbol = Symbol('agentRuntime');

/**
 * The host interface — only requires execRun so the runtime can delegate
 * execution back through the controller's prototype chain (AOP/mock friendly).
 */
export interface AgentControllerHost {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage>;
}

// ─── helper functions ──────────────────────────────────────────────

const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'cancelled', 'expired']);

/**
 * Convert an AgentStreamMessage's message field into OpenAI MessageContentBlock[].
 */
function toContentBlocks(msg: AgentStreamMessage['message']): MessageContentBlock[] {
  if (!msg) return [];
  const content = msg.content;
  if (typeof content === 'string') {
    return [{ type: 'text', text: { value: content, annotations: [] } }];
  }
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text')
      .map((part) => ({ type: 'text' as const, text: { value: part.text, annotations: [] } }));
  }
  return [];
}

/**
 * Build a completed MessageObject from an AgentStreamMessage.
 */
function toMessageObject(msg: AgentStreamMessage['message'], runId?: string): MessageObject {
  return {
    id: newMsgId(),
    object: 'thread.message',
    created_at: nowUnix(),
    run_id: runId,
    role: 'assistant',
    status: 'completed',
    content: toContentBlocks(msg),
  };
}

/**
 * Extract MessageObjects and accumulated usage from AgentStreamMessage objects.
 */
function extractFromStreamMessages(
  messages: AgentStreamMessage[],
  runId?: string,
): {
  output: MessageObject[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
} {
  const output: MessageObject[] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let hasUsage = false;

  for (const msg of messages) {
    if (msg.message) {
      output.push(toMessageObject(msg.message, runId));
    }
    if (msg.usage) {
      hasUsage = true;
      promptTokens += msg.usage.prompt_tokens ?? 0;
      completionTokens += msg.usage.completion_tokens ?? 0;
      totalTokens += msg.usage.total_tokens ?? 0;
    }
  }

  let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
  if (hasUsage) {
    usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: Math.max(promptTokens + completionTokens, totalTokens),
    };
  }

  return { output, usage };
}

/**
 * Convert input messages to MessageObjects for thread history.
 * System messages are filtered out — they are transient instructions, not conversation history.
 */
function toInputMessageObjects(messages: CreateRunInput['input']['messages'], threadId?: string): MessageObject[] {
  return messages
    .filter((m): m is typeof m & { role: 'user' | 'assistant' } => m.role !== 'system')
    .map((m) => ({
      id: newMsgId(),
      object: 'thread.message' as const,
      created_at: nowUnix(),
      thread_id: threadId,
      role: m.role,
      status: 'completed' as const,
      content:
        typeof m.content === 'string'
          ? [{ type: 'text' as const, text: { value: m.content, annotations: [] } }]
          : m.content.map((p) => ({ type: 'text' as const, text: { value: p.text, annotations: [] } })),
    }));
}

// ─── AgentRuntime class ────────────────────────────────────────────

export class AgentRuntime {
  private store: AgentStore;
  private runningTasks: Map<string, { promise: Promise<void>; abortController: AbortController }>;
  private host: AgentControllerHost;

  constructor(host: AgentControllerHost, store: AgentStore) {
    this.host = host;
    this.store = store;
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

    try {
      const startedAt = nowUnix();
      await this.store.updateRun(run.id, { status: 'in_progress', started_at: startedAt });

      const streamMessages: AgentStreamMessage[] = [];
      for await (const msg of this.host.execRun(input)) {
        streamMessages.push(msg);
      }
      const { output, usage } = extractFromStreamMessages(streamMessages, run.id);

      const completedAt = nowUnix();
      await this.store.updateRun(run.id, {
        status: 'completed',
        output,
        usage,
        completed_at: completedAt,
      });

      await this.store.appendMessages(threadId, [...toInputMessageObjects(input.input.messages, threadId), ...output]);

      return {
        id: run.id,
        object: 'thread.run',
        created_at: run.created_at,
        thread_id: threadId,
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt,
        output,
        usage,
        metadata: run.metadata,
      };
    } catch (err: any) {
      const failedAt = nowUnix();
      await this.store.updateRun(run.id, {
        status: 'failed',
        last_error: { code: 'EXEC_ERROR', message: err.message },
        failed_at: failedAt,
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

    const abortController = new AbortController();

    const promise = (async () => {
      try {
        await this.store.updateRun(run.id, { status: 'in_progress', started_at: nowUnix() });

        const streamMessages: AgentStreamMessage[] = [];
        for await (const msg of this.host.execRun(input, abortController.signal)) {
          if (abortController.signal.aborted) break;
          streamMessages.push(msg);
        }

        if (abortController.signal.aborted) return;

        const { output, usage } = extractFromStreamMessages(streamMessages, run.id);

        await this.store.updateRun(run.id, {
          status: 'completed',
          output,
          usage,
          completed_at: nowUnix(),
        });

        await this.store.appendMessages(threadId!, [
          ...toInputMessageObjects(input.input.messages, threadId),
          ...output,
        ]);
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          try {
            await this.store.updateRun(run.id, {
              status: 'failed',
              last_error: { code: 'EXEC_ERROR', message: err.message },
              failed_at: nowUnix(),
            });
          } catch (storeErr) {
            console.error('[AgentController] failed to update run status after error:', storeErr);
          }
        } else {
          console.error('[AgentController] execRun error during abort:', err);
        }
      } finally {
        this.runningTasks.delete(run.id);
      }
    })();

    this.runningTasks.set(run.id, { promise, abortController });

    return {
      id: run.id,
      object: 'thread.run',
      created_at: run.created_at,
      thread_id: threadId,
      status: 'queued',
      metadata: run.metadata,
    };
  }

  async streamRun(input: CreateRunInput): Promise<void> {
    const runtimeCtx = ContextHandler.getContext();
    if (!runtimeCtx) {
      throw new Error('streamRun must be called within a request context');
    }
    const ctx = runtimeCtx.get(EGG_CONTEXT);

    // Bypass Koa response handling — write SSE directly to the raw response
    ctx.respond = false;
    const res = ctx.res;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Abort execRun generator when client disconnects
    const abortController = new AbortController();
    res.on('close', () => abortController.abort());

    let threadId = input.thread_id;
    if (!threadId) {
      const thread = await this.store.createThread();
      threadId = thread.id;
      input = { ...input, thread_id: threadId };
    }

    const run = await this.store.createRun(input.input.messages, threadId, input.config, input.metadata);

    const runObj: RunObject = {
      id: run.id,
      object: 'thread.run',
      created_at: run.created_at,
      thread_id: threadId,
      status: 'queued',
      metadata: run.metadata,
    };

    // event: thread.run.created
    res.write(`event: thread.run.created\ndata: ${JSON.stringify(runObj)}\n\n`);

    // event: thread.run.in_progress
    runObj.status = 'in_progress';
    runObj.started_at = nowUnix();
    await this.store.updateRun(run.id, { status: 'in_progress', started_at: runObj.started_at });
    res.write(`event: thread.run.in_progress\ndata: ${JSON.stringify(runObj)}\n\n`);

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
    res.write(`event: thread.message.created\ndata: ${JSON.stringify(msgObj)}\n\n`);

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
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
          res.write(`event: thread.message.delta\ndata: ${JSON.stringify(delta)}\n\n`);
        }
        if (msg.usage) {
          hasUsage = true;
          promptTokens += msg.usage.prompt_tokens ?? 0;
          completionTokens += msg.usage.completion_tokens ?? 0;
          totalTokens += msg.usage.total_tokens ?? 0;
        }
      }

      // If client disconnected / abort signaled, emit cancelled and return
      if (abortController.signal.aborted) {
        const cancelledAt = nowUnix();
        try {
          await this.store.updateRun(run.id, { status: 'cancelled', cancelled_at: cancelledAt });
        } catch {
          // Ignore store update failure during abort
        }
        runObj.status = 'cancelled';
        runObj.cancelled_at = cancelledAt;
        if (!res.writableEnded) {
          res.write(`event: thread.run.cancelled\ndata: ${JSON.stringify(runObj)}\n\n`);
        }
        return;
      }

      // event: thread.message.completed
      msgObj.status = 'completed';
      msgObj.content = accumulatedContent;
      res.write(`event: thread.message.completed\ndata: ${JSON.stringify(msgObj)}\n\n`);

      // Build final output
      const output: MessageObject[] = accumulatedContent.length > 0 ? [msgObj] : [];
      let usage: RunObject['usage'];
      if (hasUsage) {
        usage = {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: Math.max(promptTokens + completionTokens, totalTokens),
        };
      }

      const completedAt = nowUnix();
      await this.store.updateRun(run.id, {
        status: 'completed',
        output,
        usage,
        completed_at: completedAt,
      });

      await this.store.appendMessages(threadId!, [...toInputMessageObjects(input.input.messages, threadId), ...output]);

      // event: thread.run.completed
      runObj.status = 'completed';
      runObj.completed_at = completedAt;
      runObj.usage = usage;
      runObj.output = output;
      res.write(`event: thread.run.completed\ndata: ${JSON.stringify(runObj)}\n\n`);
    } catch (err: any) {
      const failedAt = nowUnix();
      try {
        await this.store.updateRun(run.id, {
          status: 'failed',
          last_error: { code: 'EXEC_ERROR', message: err.message },
          failed_at: failedAt,
        });
      } catch (storeErr) {
        console.error('[AgentController] failed to update run status after error:', storeErr);
      }

      // event: thread.run.failed
      runObj.status = 'failed';
      runObj.failed_at = failedAt;
      runObj.last_error = { code: 'EXEC_ERROR', message: err.message };
      if (!res.writableEnded) {
        res.write(`event: thread.run.failed\ndata: ${JSON.stringify(runObj)}\n\n`);
      }
    } finally {
      // event: done
      if (!res.writableEnded) {
        res.write('event: done\ndata: [DONE]\n\n');
        res.end();
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
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new AgentConflictError(`Cannot cancel run with status '${run.status}'`);
    }

    const cancelledAt = nowUnix();
    await this.store.updateRun(runId, {
      status: 'cancelled',
      cancelled_at: cancelledAt,
    });

    return {
      id: run.id,
      object: 'thread.run',
      created_at: run.created_at,
      thread_id: run.thread_id,
      status: 'cancelled',
      cancelled_at: cancelledAt,
    };
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
