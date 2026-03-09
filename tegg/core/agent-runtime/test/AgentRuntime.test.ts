import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import {
  RunStatus,
  AgentSSEEvent,
  AgentObjectType,
  MessageRole,
  MessageStatus,
  ContentBlockType,
} from '@eggjs/tegg-types/agent-runtime';
import type {
  ObjectStorageClient,
  RunRecord,
  CreateRunInput,
  AgentStreamMessage,
  MessageContentBlock,
} from '@eggjs/tegg-types/agent-runtime';
import { AgentNotFoundError, AgentConflictError } from '@eggjs/tegg-types/agent-runtime';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentRuntime } from '../src/AgentRuntime.ts';
import type { AgentExecutor, AgentRuntimeOptions } from '../src/AgentRuntime.ts';
import { OSSAgentStore } from '../src/OSSAgentStore.ts';
import type { SSEWriter } from '../src/SSEWriter.ts';

class MapStorageClient implements ObjectStorageClient {
  private readonly store = new Map<string, string>();

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async append(key: string, value: string): Promise<void> {
    const existing = this.store.get(key) ?? '';
    this.store.set(key, existing + value);
  }
}

class MockSSEWriter implements SSEWriter {
  events: Array<{ event: string; data: unknown }> = [];
  closed = false;
  private closeCallbacks: Array<() => void> = [];

  writeEvent(event: string, data: unknown): void {
    this.events.push({ event, data });
  }

  end(): void {
    this.closed = true;
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  simulateClose(): void {
    this.closed = true;
    for (const cb of this.closeCallbacks) cb();
  }
}

async function waitForRunStatus(
  agentStore: OSSAgentStore,
  runId: string,
  expectedStatus: RunStatus,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await agentStore.getRun(runId);
    if (run.status === expectedStatus) return;
    await setTimeout(10);
  }
  throw new Error(`Run ${runId} did not reach status '${expectedStatus}' within ${timeoutMs}ms`);
}

function createSlowExecRun(chunks: AgentStreamMessage[], onYielded?: () => void): AgentExecutor['execRun'] {
  return async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage> {
    for (const chunk of chunks) {
      yield chunk;
    }
    onYielded?.();
    await new Promise<void>((resolve, reject) => {
      const timer = globalThis.setTimeout(resolve, 5000);
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('aborted'));
          },
          { once: true },
        );
      }
    });
  };
}

function createBlockingExecRun(
  resolveRef: { resolve?: () => void },
  chunks: AgentStreamMessage[],
): AgentExecutor['execRun'] {
  return async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage> {
    await new Promise<void>((resolve, reject) => {
      resolveRef.resolve = resolve;
      if (signal) {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }
    });
    for (const chunk of chunks) {
      yield chunk;
    }
  };
}

describe('test/AgentRuntime.test.ts', () => {
  let runtime: AgentRuntime;
  let store: OSSAgentStore;
  let host: AgentExecutor;

  beforeEach(() => {
    store = new OSSAgentStore({ client: new MapStorageClient() });
    host = {
      async *execRun(input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
        const messages = input.input.messages;
        yield {
          message: {
            role: MessageRole.Assistant,
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
        yield {
          usage: { promptTokens: 10, completionTokens: 5 },
        };
      },
    };
    runtime = new AgentRuntime({
      host,
      store,
      logger: {
        error() {
          /* noop */
        },
      } as unknown as AgentRuntimeOptions['logger'],
    });
  });

  afterEach(async () => {
    await runtime.destroy();
  });

  describe('createThread', () => {
    it('should create a thread and return ThreadObject', async () => {
      const result = await runtime.createThread();
      assert(result.id.startsWith('thread_'));
      assert.equal(result.object, AgentObjectType.Thread);
      assert(typeof result.createdAt === 'number');
      // Unix seconds
      assert(result.createdAt <= Math.floor(Date.now() / 1000));
      assert(typeof result.metadata === 'object');
    });
  });

  describe('getThread', () => {
    it('should get a thread by id', async () => {
      const created = await runtime.createThread();

      const result = await runtime.getThread(created.id);
      assert.equal(result.id, created.id);
      assert.equal(result.object, AgentObjectType.Thread);
      assert(Array.isArray(result.messages));
    });

    it('should throw AgentNotFoundError for non-existent thread', async () => {
      await assert.rejects(
        () => runtime.getThread('thread_xxx'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          return true;
        },
      );
    });
  });

  describe('syncRun', () => {
    it('should collect all chunks and return completed RunObject', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, AgentObjectType.ThreadRun);
      assert.equal(result.status, RunStatus.Completed);
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));
      assert.equal(result.output!.length, 1);
      assert.equal(result.output![0].object, AgentObjectType.ThreadMessage);
      assert.equal(result.output![0]['role'], MessageRole.Assistant);
      assert.equal(result.output![0]['status'], MessageStatus.Completed);
      const content = result.output![0]['content'] as MessageContentBlock[];
      assert.equal(content[0].type, ContentBlockType.Text);
      assert.equal(content[0].text.value, 'Hello 1 messages');
      assert(Array.isArray(content[0].text.annotations));
      assert.equal(result.usage!.promptTokens, 10);
      assert.equal(result.usage!.completionTokens, 5);
      assert.equal(result.usage!.totalTokens, 15);
      assert(result.startedAt! >= result.createdAt, 'startedAt should be >= createdAt');
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { user_id: 'u_1', trace: 'xyz' };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepStrictEqual(result.metadata, meta);

      const run = await store.getRun(result.id);
      assert.deepStrictEqual(run.metadata, meta);
    });

    it('should store the run in the store', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Completed);
      assert(run.completedAt);
    });

    it('should append messages to thread when threadId provided', async () => {
      const thread = await runtime.createThread();

      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0]['role'], MessageRole.User);
      assert.equal(updated.messages[1]['role'], MessageRole.Assistant);
    });

    it('should auto-create thread and append messages when threadId not provided', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));

      const thread = await runtime.getThread(result.threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0]['role'], MessageRole.User);
      assert.equal(thread.messages[1]['role'], MessageRole.Assistant);
    });

    it('should not throw when store.updateRun fails in catch block', async () => {
      host.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        throw new Error('exec failed');
      };

      let callCount = 0;
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('store down');
        }
        return origUpdateRun(runId, updates);
      };

      await assert.rejects(
        () => runtime.syncRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }),
        (err: unknown) => {
          assert(err instanceof Error);
          assert.equal(err.message, 'exec failed');
          return true;
        },
      );
    });
  });

  describe('asyncRun', () => {
    it('should return queued status immediately with auto-created threadId', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, AgentObjectType.ThreadRun);
      assert.equal(result.status, RunStatus.Queued);
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));
    });

    it('should complete the run in the background', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Completed);
      const outputContent = run.output![0]['content'] as MessageContentBlock[];
      assert.equal(outputContent[0].text.value, 'Hello 1 messages');
    });

    it('should auto-create thread and append messages when threadId not provided', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.threadId);

      await runtime.waitForPendingTasks();

      const thread = await store.getThread(result.threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0]['role'], MessageRole.User);
      assert.equal(thread.messages[1]['role'], MessageRole.Assistant);
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { session: 'sess_1' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepStrictEqual(result.metadata, meta);

      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.deepStrictEqual(run.metadata, meta);
    });
  });

  describe('streamRun', () => {
    it('should emit correct SSE event sequence for normal flow', async () => {
      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventNames = writer.events.map((e) => e.event);
      assert(eventNames.includes(AgentSSEEvent.ThreadRunCreated));
      assert(eventNames.includes(AgentSSEEvent.ThreadRunInProgress));
      assert(eventNames.includes(AgentSSEEvent.ThreadMessageCreated));
      assert(eventNames.includes(AgentSSEEvent.ThreadMessageDelta));
      assert(eventNames.includes(AgentSSEEvent.ThreadMessageCompleted));
      assert(eventNames.includes(AgentSSEEvent.ThreadRunCompleted));
      assert(eventNames.includes(AgentSSEEvent.Done));
      assert(writer.closed);

      // Verify order: created < in_progress < message.created < delta < message.completed < run.completed < done
      const createdIdx = eventNames.indexOf(AgentSSEEvent.ThreadRunCreated);
      const progressIdx = eventNames.indexOf(AgentSSEEvent.ThreadRunInProgress);
      const msgCreatedIdx = eventNames.indexOf(AgentSSEEvent.ThreadMessageCreated);
      const deltaIdx = eventNames.indexOf(AgentSSEEvent.ThreadMessageDelta);
      const msgCompletedIdx = eventNames.indexOf(AgentSSEEvent.ThreadMessageCompleted);
      const runCompletedIdx = eventNames.indexOf(AgentSSEEvent.ThreadRunCompleted);
      const doneIdx = eventNames.indexOf(AgentSSEEvent.Done);
      assert(createdIdx < progressIdx);
      assert(progressIdx < msgCreatedIdx);
      assert(msgCreatedIdx < deltaIdx);
      assert(deltaIdx < msgCompletedIdx);
      assert(msgCompletedIdx < runCompletedIdx);
      assert(runCompletedIdx < doneIdx);
    });

    it('should emit cancelled event on client disconnect', async () => {
      let resolveYielded!: () => void;
      const yieldedPromise = new Promise<void>((r) => {
        resolveYielded = r;
      });

      host.execRun = async function* (
        _input: CreateRunInput,
        signal?: AbortSignal,
      ): AsyncGenerator<AgentStreamMessage> {
        yield { message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'start' }] } };
        resolveYielded();
        await new Promise<void>((resolve) => {
          const timer = globalThis.setTimeout(resolve, 5000);
          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                resolve();
              },
              { once: true },
            );
          }
        });
      };

      const writer = new MockSSEWriter();

      const streamPromise = runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      await yieldedPromise;
      writer.simulateClose();

      await streamPromise;

      const eventNames = writer.events.map((e) => e.event);
      assert(eventNames.includes(AgentSSEEvent.ThreadRunCreated));
      assert(eventNames.includes(AgentSSEEvent.ThreadRunInProgress));
    });

    it('should emit failed event when execRun throws', async () => {
      host.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        throw new Error('model unavailable');
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventNames = writer.events.map((e) => e.event);
      assert(eventNames.includes(AgentSSEEvent.ThreadRunFailed));
      assert(eventNames.includes(AgentSSEEvent.Done));
      assert(writer.closed);
    });
  });

  describe('getRun', () => {
    it('should get a run by id', async () => {
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const result = await runtime.getRun(syncResult.id);
      assert.equal(result.id, syncResult.id);
      assert.equal(result.object, AgentObjectType.ThreadRun);
      assert.equal(result.status, RunStatus.Completed);
      assert(typeof result.createdAt === 'number');
    });

    it('should return metadata from getRun', async () => {
      const meta = { source: 'api' };
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });

      const result = await runtime.getRun(syncResult.id);
      assert.deepStrictEqual(result.metadata, meta);
    });
  });

  describe('cancelRun', () => {
    it('should cancel a run', async () => {
      host.execRun = createSlowExecRun([
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'start' }] },
        },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      const cancelResult = await runtime.cancelRun(result.id);
      assert.equal(cancelResult.id, result.id);
      assert.equal(cancelResult.object, AgentObjectType.ThreadRun);
      assert.equal(cancelResult.status, RunStatus.Cancelled);

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Cancelled);
      assert(run.cancelledAt);
    });

    it('should write cancelling then cancelled to store', async () => {
      host.execRun = createSlowExecRun([
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'start' }] },
        },
      ]);

      const statusHistory: string[] = [];
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        if (updates.status) {
          statusHistory.push(updates.status);
        }
        return origUpdateRun(runId, updates);
      };

      const asyncResult = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hello' }] },
      });

      await waitForRunStatus(store, asyncResult.id, RunStatus.InProgress);
      statusHistory.length = 0;

      await runtime.cancelRun(asyncResult.id);

      const cancellingIdx = statusHistory.indexOf(RunStatus.Cancelling);
      const cancelledIdx = statusHistory.indexOf(RunStatus.Cancelled);
      assert(cancellingIdx >= 0, 'cancelling should have been written');
      assert(cancelledIdx > cancellingIdx, 'cancelled should come after cancelling');
    });

    it('should throw AgentConflictError when cancelling a completed run', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(result.status, RunStatus.Completed);

      await assert.rejects(
        () => runtime.cancelRun(result.id),
        (err: unknown) => {
          assert(err instanceof AgentConflictError);
          return true;
        },
      );
    });

    it('should not overwrite cancelling status with completed (cross-worker scenario)', async () => {
      const resolveRef: { resolve?: () => void } = {};
      host.execRun = createBlockingExecRun(resolveRef, [
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'done' }] },
        },
        {
          usage: { promptTokens: 1, completionTokens: 1 },
        },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      await store.updateRun(result.id, { status: RunStatus.Cancelling });

      resolveRef.resolve!();
      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Cancelling);
    });

    it('should not overwrite terminal state when run completes during cancellation (TOCTOU)', async () => {
      const resolveRef: { resolve?: () => void } = {};
      host.execRun = createBlockingExecRun(resolveRef, [
        {
          message: { role: MessageRole.Assistant, content: [{ type: 'text', text: 'done' }] },
        },
        { usage: { promptTokens: 1, completionTokens: 1 } },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        await origUpdateRun(runId, updates);
        if (updates.status === RunStatus.Cancelling) {
          await origUpdateRun(runId, { status: RunStatus.Completed, completedAt: Math.floor(Date.now() / 1000) });
          store.updateRun = origUpdateRun;
        }
      };

      resolveRef.resolve!();

      const cancelResult = await runtime.cancelRun(result.id);
      assert.equal(cancelResult.status, RunStatus.Completed);
    });
  });
});
