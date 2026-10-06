import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import type {
  RunRecord,
  CreateRunInput,
  AgentMessage,
  SDKResultMessage,
  StreamEvent,
} from '@eggjs/tegg-types/agent-runtime';
import {
  RunStatus,
  AgentObjectType,
  AgentNotFoundError,
  AgentConflictError,
  AgentTimeoutError,
} from '@eggjs/tegg-types/agent-runtime';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentRuntime } from '../src/AgentRuntime.ts';
import type { AgentExecutor, AgentRuntimeOptions } from '../src/AgentRuntime.ts';
import { OSSAgentStore } from '../src/OSSAgentStore.ts';
import type { SSEWriter } from '../src/SSEWriter.ts';
import { MapStorageClient } from './helpers.ts';

class MockSSEWriter implements SSEWriter {
  events: Array<{ event: string; data: unknown }> = [];
  comments: string[] = [];
  closed = false;
  private closeCallbacks: Array<() => void> = [];

  writeEvent(event: string, data: unknown): void {
    this.events.push({ event, data });
  }

  writeComment(text: string): void {
    this.comments.push(text);
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

function createSlowExecRun(chunks: AgentMessage[], onYielded?: () => void): AgentExecutor['execRun'] {
  return async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage> {
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

function createBlockingExecRun(resolveRef: { resolve?: () => void }, chunks: AgentMessage[]): AgentExecutor['execRun'] {
  return async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage> {
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
  let executor: AgentExecutor;

  beforeEach(() => {
    store = new OSSAgentStore({ client: new MapStorageClient() });
    executor = {
      async *execRun(input: CreateRunInput): AsyncGenerator<AgentMessage> {
        const messages = input.input.messages;
        yield {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
        yield {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 10, output_tokens: 5 },
        } as SDKResultMessage;
      },
    };
    runtime = new AgentRuntime({
      executor,
      store,
      logger: {
        info() {
          /* noop */
        },
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
      // Should have: user input message + assistant message + result message
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0].type, 'user');
      assert.equal(updated.messages[1].type, 'assistant');
    });

    it('should auto-create thread and append messages when threadId not provided', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.threadId);
      assert(result.threadId.startsWith('thread_'));

      const thread = await runtime.getThread(result.threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].type, 'user');
      assert.equal(thread.messages[1].type, 'assistant');
    });

    it('should set isResume=false when no threadId provided (auto-create)', async () => {
      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentMessage> {
        capturedInput = input;
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } };
      };

      await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(capturedInput!.isResume, false);
    });

    it('should set isResume=false when threadId provided but thread has no messages', async () => {
      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentMessage> {
        capturedInput = input;
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } };
      };

      const thread = await runtime.createThread();
      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(capturedInput!.isResume, false);
    });

    it('should set isResume=true when threadId provided and thread has messages', async () => {
      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentMessage> {
        capturedInput = input;
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } };
      };

      // First run creates thread with messages
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Second run on the same thread — now it has history
      await runtime.syncRun({
        threadId: result.threadId,
        input: { messages: [{ role: 'user', content: 'Hello again' }] },
      });
      assert.equal(capturedInput!.isResume, true);
    });

    it('should not throw when store.updateRun fails in catch block', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
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

    it('should persist the partial transcript and mark Failed when execRun throws after committing', async () => {
      const thread = await runtime.createThread();
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } };
        throw new Error('stream terminated');
      };

      await assert.rejects(
        () => runtime.syncRun({ threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } }),
        (err: unknown) => {
          assert(err instanceof Error);
          assert.equal(err.message, 'stream terminated');
          return true;
        },
      );

      // The failed turn must not vanish: user + committed assistant are persisted.
      const persisted = await store.getThread(thread.id);
      assert.equal(persisted.messages.length, 2);
      assert.equal(persisted.messages[0].type, 'user');
      assert.equal(persisted.messages[1].type, 'assistant');
    });

    it('should not duplicate thread messages when updateRun fails after a successful append', async () => {
      const thread = await runtime.createThread();
      // Executor finishes normally (commits), so the success path appends, then
      // the completing updateRun throws — routing into the catch block.
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } };
        yield {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 1, output_tokens: 1 },
        } as SDKResultMessage;
      };
      // Fail the 2nd updateRun (1=rb.start, 2=rb.complete) — i.e. right after
      // the success-path appendMessages has already written the transcript.
      let calls = 0;
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        calls++;
        if (calls === 2) throw new Error('updateRun failed');
        return origUpdateRun(runId, updates);
      };

      await assert.rejects(() =>
        runtime.syncRun({ threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } }),
      );

      // Messages must be appended exactly once — the catch-block persist must be
      // a no-op because the success path already persisted (no duplicate history).
      const persisted = await store.getThread(thread.id);
      assert.equal(persisted.messages.length, 2);
      assert.equal(persisted.messages[0].type, 'user');
      assert.equal(persisted.messages[1].type, 'assistant');
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
    });

    it('should auto-create thread and append messages when threadId not provided', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.threadId);

      await runtime.waitForPendingTasks();

      const thread = await store.getThread(result.threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].type, 'user');
      assert.equal(thread.messages[1].type, 'assistant');
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

    it('should persist the partial transcript and mark Failed when execRun throws after committing', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } };
        throw new Error('stream terminated');
      };

      const result = await runtime.asyncRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } });
      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, RunStatus.Failed);

      const thread = await store.getThread(result.threadId!);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].type, 'user');
      assert.equal(thread.messages[1].type, 'assistant');
    });
  });

  describe('streamRun', () => {
    it('should emit StreamEvent sequence: run_created, message events, done', async () => {
      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventTypes = writer.events.map((e) => e.event);
      assert(eventTypes.includes('run_created'), 'should have run_created event');
      assert(eventTypes.includes('done'), 'should have done event');
      assert(writer.closed, 'writer should be closed');

      // Verify order: run_created comes first, done comes last
      const createdIdx = eventTypes.indexOf('run_created');
      const doneIdx = eventTypes.indexOf('done');
      assert(createdIdx === 0, 'run_created should be first');
      assert(doneIdx === eventTypes.length - 1, 'done should be last');

      // Verify StreamEvent format: { seq, type, data, ts }
      for (const ev of writer.events) {
        const streamEvent = ev.data as StreamEvent;
        assert(typeof streamEvent.seq === 'number', 'seq should be a number');
        assert(typeof streamEvent.type === 'string', 'type should be a string');
        assert(typeof streamEvent.ts === 'number', 'ts should be a number');
        assert('data' in streamEvent, 'should have data field');
      }

      // Verify sequential seq numbers
      const seqs = writer.events.map((e) => (e.data as StreamEvent).seq);
      for (let i = 1; i < seqs.length; i++) {
        assert(seqs[i] === seqs[i - 1] + 1, `seq should be sequential: ${seqs[i]} after ${seqs[i - 1]}`);
      }

      // Verify run_created data has runId and threadId
      const runCreatedEvent = writer.events[0].data as StreamEvent;
      assert((runCreatedEvent.data as any).runId, 'run_created should have runId');
      assert((runCreatedEvent.data as any).threadId, 'run_created should have threadId');

      // Verify messages persisted to thread
      const threadId = (runCreatedEvent.data as any).threadId;
      const thread = await runtime.getThread(threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].type, 'user');
      assert.equal(thread.messages[1].type, 'assistant');
    });

    it('should continue background execution on client disconnect', async () => {
      let resolveYielded!: () => void;
      const yieldedPromise = new Promise<void>((r) => {
        resolveYielded = r;
      });

      executor.execRun = async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'start' }] } };
        resolveYielded();
        // Simulate more work after client disconnects
        await setTimeout(50);
        if (!signal?.aborted) {
          yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: ' end' }] } };
        }
      };

      const writer = new MockSSEWriter();
      const streamPromise = runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      // Wait for first chunk to be yielded, then give the writer time to receive it
      await yieldedPromise;
      await setTimeout(50);
      writer.simulateClose();
      await streamPromise;

      // Writer should have received at least run_created before disconnect
      assert(writer.events.length >= 1, 'should have at least run_created event');

      // Background task should complete — wait for it
      await runtime.waitForPendingTasks();

      // Verify the run completed in the store (not cancelled)
      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Completed, 'run should complete despite client disconnect');
    });

    it('should forward SDK message types as event types', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: 'system', subtype: 'init', session_id: 'sess-1' };
        yield { type: 'stream_event', event: { type: 'content_block_delta' } };
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] } };
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventTypes = writer.events.map((e) => e.event);
      assert(eventTypes.includes('system'), 'should forward system event');
      assert(eventTypes.includes('stream_event'), 'should forward stream_event');
      assert(eventTypes.includes('assistant'), 'should forward assistant event');
    });

    it('should pass through SDK message directly as event data', async () => {
      const sdkMsg: AgentMessage = {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'raw hello' }] },
      };
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield sdkMsg;
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const assistantEvent = writer.events.find((e) => e.event === 'assistant');
      assert.ok(assistantEvent);
      const streamEvent = assistantEvent.data as StreamEvent;
      assert.deepStrictEqual(streamEvent.data, sdkMsg, 'should pass SDK message directly as data');
    });

    it('should use "message" as default event type when type is not set', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: '', message: { content: 'Hello' } } as unknown as AgentMessage;
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const eventTypes = writer.events.map((e) => e.event);
      assert(eventTypes.includes('message'), 'should fallback to "message" for empty type');
    });

    it('should emit error event when execRun throws', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        throw new Error('model unavailable');
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const errorEvent = writer.events.find((e) => e.event === 'error');
      assert.ok(errorEvent, 'should have error event');
      const streamEvent = errorEvent.data as StreamEvent;
      assert.equal((streamEvent.data as any).message, 'model unavailable');
      assert(writer.closed);

      // Verify run is marked as failed in store
      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Failed);
    });

    it('should persist the partial transcript when execRun throws after committing', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } };
        throw new Error('stream terminated');
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const threadId = (runCreatedEvent.data as any).threadId;

      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Failed);

      // The failed turn must not vanish from thread history.
      const thread = await runtime.getThread(threadId);
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[0].type, 'user');
      assert.equal(thread.messages[1].type, 'assistant');
    });

    it('should persist usage to store on completion', async () => {
      executor.execRun = async function* (): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { content: 'Hi' } };
        yield {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 10, output_tokens: 8 },
        } as SDKResultMessage;
      };

      const writer = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      const runCreatedEvent = writer.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const run = await runtime.getRun(runId);
      assert.equal(run.status, RunStatus.Completed);
      assert.equal(run.usage!.promptTokens, 10);
      assert.equal(run.usage!.completionTokens, 8);
      assert.equal(run.usage!.totalTokens, 18);
    });
  });

  describe('getRunStream', () => {
    it('should replay all events on reconnect with lastSeq=0', async () => {
      const writer1 = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer1);

      // Get runId from the first event
      const runCreatedEvent = writer1.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;

      // Reconnect and get all events
      const writer2 = new MockSSEWriter();
      await runtime.getRunStream(runId, writer2, 0);

      // Should get the same events
      assert.equal(writer2.events.length, writer1.events.length);
      for (let i = 0; i < writer1.events.length; i++) {
        const se1 = writer1.events[i].data as StreamEvent;
        const se2 = writer2.events[i].data as StreamEvent;
        assert.equal(se1.seq, se2.seq);
        assert.equal(se1.type, se2.type);
      }
    });

    it('should replay only events after lastSeq', async () => {
      const writer1 = new MockSSEWriter();
      await runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer1);

      const runCreatedEvent = writer1.events[0].data as StreamEvent;
      const runId = (runCreatedEvent.data as any).runId;
      const totalEvents = writer1.events.length;

      // Reconnect from seq 2 (skip first 2 events)
      const writer2 = new MockSSEWriter();
      await runtime.getRunStream(runId, writer2, 2);

      assert.equal(writer2.events.length, totalEvents - 2);
      const firstReplayedSeq = (writer2.events[0].data as StreamEvent).seq;
      assert.equal(firstReplayedSeq, 3);
    });

    it('should throw AgentNotFoundError for unknown runId', async () => {
      const writer = new MockSSEWriter();
      await assert.rejects(
        () => runtime.getRunStream('run_nonexistent', writer),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          return true;
        },
      );
    });

    it('should stream real-time events during reconnect to running task', async () => {
      let resolveExec!: () => void;
      const execPromise = new Promise<void>((r) => {
        resolveExec = r;
      });

      executor.execRun = async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { content: 'chunk1' } };
        // Wait for reconnect to happen
        await execPromise;
        if (!signal?.aborted) {
          yield { type: 'assistant', message: { content: 'chunk2' } };
        }
      };

      // Start streaming and disconnect immediately after first events
      const writer1 = new MockSSEWriter();
      const streamPromise = runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer1);

      // Wait a bit for the first chunk to be buffered
      await setTimeout(50);
      writer1.simulateClose();
      await streamPromise;

      const runId = ((writer1.events[0].data as StreamEvent).data as any).runId;

      // Reconnect — should get replayed events then real-time
      const writer2 = new MockSSEWriter();
      const reconnectPromise = runtime.getRunStream(runId, writer2, 0);

      // Let the background task continue
      await setTimeout(20);
      resolveExec();

      await runtime.waitForPendingTasks();
      // Give streamEventsToWriter time to process the final events
      await setTimeout(20);

      // Close writer2 to end reconnect
      writer2.simulateClose();
      await reconnectPromise;

      // writer2 should have received all events including chunk2 and done
      const eventTypes = writer2.events.map((e) => e.event);
      assert(eventTypes.includes('done'), 'reconnected stream should receive done event');
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

  describe('getLatestRunId', () => {
    it('should resolve the most recent run id for a thread', async () => {
      const created = await runtime.createThread();
      const run = await runtime.syncRun({
        threadId: created.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // latestRunId is recorded in the background; drain before asserting.
      await store.awaitPendingWrites();
      const result = await runtime.getLatestRunId(created.id);
      assert.deepStrictEqual(result, { threadId: created.id, runId: run.id });
    });

    it('should return runId null for a thread with no run', async () => {
      const created = await runtime.createThread();
      const result = await runtime.getLatestRunId(created.id);
      assert.deepStrictEqual(result, { threadId: created.id, runId: null });
    });

    it('should reject for a non-existent thread', async () => {
      await assert.rejects(() => runtime.getLatestRunId('thread_non_existent'));
    });
  });

  describe('cancelRun', () => {
    it('should cancel a run', async () => {
      executor.execRun = createSlowExecRun([
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'start' }] } },
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
      executor.execRun = createSlowExecRun([
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'start' }] } },
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
      executor.execRun = createBlockingExecRun(resolveRef, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } },
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 1, output_tokens: 1 },
        } as SDKResultMessage,
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

    it('should hold until the executor commits before aborting and persisting', async () => {
      // Simulates the Claude Code SDK startup window: the executor emits a
      // non-committing `system/init` right away and then a committing
      // `assistant` message later. cancelRun is called in between and must
      // wait for the assistant chunk before it aborts, otherwise it would
      // persist a user message against a session file that does not yet
      // exist on disk.
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => {
        resolveGate = r;
      });
      executor.execRun = async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage> {
        yield { type: 'system', subtype: 'init' } as AgentMessage;
        await gate;
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'now committed' }] } };
        await new Promise<void>((_resolve, reject) => {
          if (signal?.aborted) {
            reject(new Error('aborted'));
            return;
          }
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        });
      };

      const thread = await runtime.createThread();
      const result = await runtime.asyncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      // Give the executor time to yield the first system message; the task
      // must still be considered uncommitted because type === 'system'.
      await setTimeout(30);

      const cancelPromise = runtime.cancelRun(result.id);
      let cancelResolved = false;
      cancelPromise.then(
        () => {
          cancelResolved = true;
        },
        () => {
          cancelResolved = true;
        },
      );

      // Hold for a bit — cancel should not resolve while we are blocked in
      // the gate, because no committing message has been yielded yet.
      await setTimeout(100);
      assert.equal(cancelResolved, false, 'cancelRun must block until executor commits');

      // Release the gate so the executor yields a non-system message.
      resolveGate();
      const cancelled = await cancelPromise;
      assert.equal(cancelled.status, RunStatus.Cancelled);

      // Thread should contain both the user input and the partial assistant
      // reply — i.e. it is in sync with what the SDK jsonl would contain.
      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0].type, 'user');
      assert.equal(updated.messages[1].type, 'assistant');
    });

    it('should fail the run and leave the thread empty when cancel waits past the commit timeout', async () => {
      // Rebuild the runtime with a short commit timeout so the watchdog
      // fires before the blocking executor ever yields.
      await runtime.destroy();
      const resolveRef: { resolve?: () => void } = {};
      executor.execRun = createBlockingExecRun(resolveRef, []);
      runtime = new AgentRuntime({
        executor,
        store,
        logger: {
          info() {
            /* noop */
          },
          error() {
            /* noop */
          },
        } as unknown as AgentRuntimeOptions['logger'],
        cancelCommitTimeoutMs: 50,
      });

      const thread = await runtime.createThread();
      const result = await runtime.asyncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      await assert.rejects(
        () => runtime.cancelRun(result.id),
        (err: unknown) => {
          assert(err instanceof AgentTimeoutError, `expected AgentTimeoutError, got ${err}`);
          return true;
        },
      );

      const persisted = await store.getRun(result.id);
      assert.equal(persisted.status, RunStatus.Failed);

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 0, 'thread must stay empty when executor never committed');

      // Unblock the executor so runtime.destroy() in afterEach completes cleanly.
      resolveRef.resolve?.();
    });

    it('should not overwrite watchdog-set Failed with Completed when executor finishes naturally without committing', async () => {
      // Regression test for a TOCTOU race on the commit-timeout path:
      //   1. cancelRun's watchdog fires at cancelCommitTimeoutMs and writes Failed.
      //   2. The executor does not listen to the abort signal and finishes
      //      naturally (no committing message ever yielded).
      //   3. asyncRun's IIFE then enters its post-loop status check; without
      //      the Failed/Expired guard it would fall through to rb.complete()
      //      and overwrite the watchdog-set Failed with Completed.
      await runtime.destroy();
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => {
        resolveGate = r;
      });
      executor = {
        async *execRun(): AsyncGenerator<AgentMessage> {
          yield { type: 'system', subtype: 'init' } as AgentMessage;
          // Intentionally does NOT listen to the abort signal — simulates an
          // executor that keeps running to natural completion after the
          // runtime has already declared the run Failed.
          await gate;
        },
      };
      runtime = new AgentRuntime({
        executor,
        store,
        logger: {
          info() {
            /* noop */
          },
          error() {
            /* noop */
          },
        } as unknown as AgentRuntimeOptions['logger'],
        cancelCommitTimeoutMs: 50,
      });

      const thread = await runtime.createThread();
      const result = await runtime.asyncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      const cancelPromise = runtime.cancelRun(result.id);

      // Wait well past the 50ms watchdog so Failed has definitely been
      // written, then release the gate to let the executor finish naturally.
      await setTimeout(150);
      resolveGate();

      await assert.rejects(cancelPromise, (err: unknown) => {
        assert(err instanceof AgentTimeoutError, `expected AgentTimeoutError, got ${err}`);
        return true;
      });

      const persisted = await store.getRun(result.id);
      assert.equal(
        persisted.status,
        RunStatus.Failed,
        'watchdog-set Failed must not be overwritten by post-loop rb.complete',
      );

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 0, 'thread must stay empty when executor never committed');
    });

    it('should not hold cancelRun when the executor has already committed', async () => {
      executor.execRun = createSlowExecRun([
        { type: 'system', subtype: 'init' } as AgentMessage,
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'committed' }] } },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);
      // Wait long enough for the assistant chunk to land and mark committed.
      await setTimeout(50);

      const start = Date.now();
      const cancelled = await runtime.cancelRun(result.id);
      const elapsed = Date.now() - start;
      assert.equal(cancelled.status, RunStatus.Cancelled);
      assert(elapsed < 1000, `cancelRun should return quickly when already committed, took ${elapsed}ms`);
    });

    it('should consult a custom isSessionCommitted hook instead of the default heuristic', async () => {
      // The executor yields three assistant messages; the hook treats only
      // the third as committing. cancelRun must wait for the third.
      const decisions: Array<{ text: string; committed: boolean }> = [];
      let resolveGate!: () => void;
      const gate = new Promise<void>((r) => {
        resolveGate = r;
      });
      executor.execRun = async function* (_input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage> {
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'first' }] } };
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'second' }] } };
        await gate;
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'committed' }] } };
        await new Promise<void>((_resolve, reject) => {
          if (signal?.aborted) {
            reject(new Error('aborted'));
            return;
          }
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        });
      };
      executor.isSessionCommitted = (msg: AgentMessage) => {
        const text = (msg as { message?: { content?: Array<{ text?: string }> } }).message?.content?.[0]?.text ?? '';
        const committed = text === 'committed';
        decisions.push({ text, committed });
        return committed;
      };

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);
      // Let the first two non-committing chunks land before cancelling.
      await setTimeout(30);

      const cancelPromise = runtime.cancelRun(result.id);
      let cancelResolved = false;
      cancelPromise.then(
        () => {
          cancelResolved = true;
        },
        () => {
          cancelResolved = true;
        },
      );

      await setTimeout(80);
      assert.equal(cancelResolved, false, 'cancelRun must wait for the hook to accept a message as committed');

      resolveGate();
      const cancelled = await cancelPromise;
      assert.equal(cancelled.status, RunStatus.Cancelled);
      assert(
        decisions.some((d) => d.committed),
        'hook must have observed the committing chunk',
      );
    });

    it('should not overwrite terminal state when run completes during cancellation (TOCTOU)', async () => {
      const resolveRef: { resolve?: () => void } = {};
      executor.execRun = createBlockingExecRun(resolveRef, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } },
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 1, output_tokens: 1 },
        } as SDKResultMessage,
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

  describe('abort message persistence', () => {
    // Rationale: when an executor supports resuming from a session file
    // (e.g. Claude CLI session), aborts leave partial state in that session.
    // If the thread is NOT updated with the same partial state, any
    // subsequent resume request diverges from the executor's view of history
    // and can fail at executor startup. These tests pin down that abort
    // writes the same messages to the thread that the executor has already
    // observed.

    async function waitUntil(cond: () => boolean, timeoutMs = 2000): Promise<void> {
      const start = Date.now();
      while (!cond()) {
        if (Date.now() - start > timeoutMs) throw new Error('waitUntil timeout');
        await setTimeout(10);
      }
    }

    it('syncRun: should persist user + partial assistant messages when aborted via signal', async () => {
      let yielded = false;
      executor.execRun = createSlowExecRun(
        [{ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } }],
        () => {
          yielded = true;
        },
      );

      const thread = await runtime.createThread();
      const ac = new AbortController();
      const syncPromise = runtime.syncRun(
        { threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } },
        ac.signal,
      );

      await waitUntil(() => yielded);
      ac.abort();
      const result = await syncPromise;
      assert.equal(result.threadId, thread.id);

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0].type, 'user');
      assert.equal(updated.messages[1].type, 'assistant');
      assert.deepStrictEqual((updated.messages[1].message as { content: unknown }).content, [
        { type: 'text', text: 'partial' },
      ]);
    });

    it('syncRun: should NOT persist the user message when aborted before the executor commits', async () => {
      // When an external signal aborts before the executor has yielded any
      // non-system message, the executor's underlying session (e.g. the
      // Claude Code SDK jsonl file) was never created on disk. Persisting
      // the user message to the thread in that state would cause the next
      // run to diverge from a session that does not exist, so the thread
      // must be left empty instead.
      const resolveRef: { resolve?: () => void } = {};
      executor.execRun = createBlockingExecRun(resolveRef, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'never' }] } },
      ]);

      const thread = await runtime.createThread();
      const ac = new AbortController();
      const syncPromise = runtime.syncRun(
        { threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } },
        ac.signal,
      );

      // Give syncRun time to enter the await on the executor
      await setTimeout(20);
      ac.abort();
      await syncPromise;

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 0);
    });

    it('asyncRun: should persist user + partial assistant messages when aborted via cancelRun', async () => {
      let yielded = false;
      executor.execRun = createSlowExecRun(
        [{ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } }],
        () => {
          yielded = true;
        },
      );

      const thread = await runtime.createThread();
      const result = await runtime.asyncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      await waitUntil(() => yielded);
      await runtime.cancelRun(result.id);

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0].type, 'user');
      assert.equal(updated.messages[1].type, 'assistant');
    });

    it('streamRun: should persist user + partial assistant messages when aborted via cancelRun', async () => {
      let yielded = false;
      executor.execRun = createSlowExecRun(
        [{ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } }],
        () => {
          yielded = true;
        },
      );

      const thread = await runtime.createThread();
      const writer = new MockSSEWriter();
      const streamPromise = runtime.streamRun(
        { threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } },
        writer,
      );

      await waitUntil(() => yielded);
      // Wait for run_created event to land so we can read the runId
      await waitUntil(() => writer.events.some((e) => e.event === 'run_created'));
      const runCreated = writer.events.find((e) => e.event === 'run_created')!;
      const runId = ((runCreated.data as StreamEvent).data as { runId: string }).runId;

      await runtime.cancelRun(runId);
      writer.simulateClose();
      await streamPromise;

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2);
      assert.equal(updated.messages[0].type, 'user');
      assert.equal(updated.messages[1].type, 'assistant');
    });

    it('should set isResume=true on the next run after an abort (regression: abort+continue)', async () => {
      // Reproduces the bug: user aborts turn N, then sends turn N+1. Before the fix, turn N's
      // messages were never persisted, so the second call's isResume depended only on earlier
      // completed turns — and any divergence from the executor's session caused subsequent
      // resume attempts to fail.
      let yielded = false;
      executor.execRun = createSlowExecRun(
        [{ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } }],
        () => {
          yielded = true;
        },
      );

      const thread = await runtime.createThread();
      const ac = new AbortController();
      const firstPromise = runtime.syncRun(
        { threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } },
        ac.signal,
      );
      await waitUntil(() => yielded);
      ac.abort();
      await firstPromise;

      let capturedInput: CreateRunInput | undefined;
      executor.execRun = async function* (input: CreateRunInput): AsyncGenerator<AgentMessage> {
        capturedInput = input;
        yield { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] } };
      };
      const secondResult = await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'continue' }] },
      });
      assert.equal(capturedInput!.isResume, true);
      assert.equal(capturedInput!.input.messages[0].content, 'continue');
      assert.equal(secondResult.status, RunStatus.Completed);
    });

    it('syncRun: should finalise run status to Cancelled when aborted via external signal (no cancelRun)', async () => {
      let yielded = false;
      executor.execRun = createSlowExecRun(
        [{ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } }],
        () => {
          yielded = true;
        },
      );

      const thread = await runtime.createThread();
      const ac = new AbortController();
      const syncPromise = runtime.syncRun(
        { threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } },
        ac.signal,
      );
      await waitUntil(() => yielded);
      ac.abort();
      const snapshot = await syncPromise;

      // Snapshot reflects the live store state after finalisation
      assert.equal(snapshot.status, RunStatus.Cancelled);
      const persisted = await store.getRun(snapshot.id);
      assert.equal(persisted.status, RunStatus.Cancelled);
      assert(persisted.cancelledAt);
    });

    it('asyncRun: should finalise run status to Cancelled when destroy() aborts in-flight runs', async () => {
      const resolveRef: { resolve?: () => void } = {};
      executor.execRun = createBlockingExecRun(resolveRef, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'never' }] } },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      await runtime.destroy();

      const persisted = await store.getRun(result.id);
      assert.equal(persisted.status, RunStatus.Cancelled);
    });

    it('should preserve cancelling → cancelled ordering when cancelRun drives the abort', async () => {
      // Regression guard for the finaliseAbortedRun addition: our in-branch
      // finaliser must NOT write when cancelRun has already set `cancelling`,
      // otherwise cancelRun's own `cancel()` transition would throw.
      executor.execRun = createSlowExecRun([
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } },
      ]);

      const statusHistory: string[] = [];
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        if (updates.status) statusHistory.push(updates.status);
        return origUpdateRun(runId, updates);
      };

      const asyncResult = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      await waitForRunStatus(store, asyncResult.id, RunStatus.InProgress);
      statusHistory.length = 0;

      await runtime.cancelRun(asyncResult.id);

      const cancellingWrites = statusHistory.filter((s) => s === RunStatus.Cancelling).length;
      const cancelledWrites = statusHistory.filter((s) => s === RunStatus.Cancelled).length;
      assert.equal(cancellingWrites, 1, 'cancelling should be written exactly once (by cancelRun)');
      assert.equal(cancelledWrites, 1, 'cancelled should be written exactly once (by cancelRun)');
    });

    it('should swallow store.appendMessages errors during abort cleanup', async () => {
      let yielded = false;
      executor.execRun = createSlowExecRun(
        [{ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } }],
        () => {
          yielded = true;
        },
      );

      const thread = await runtime.createThread();
      const origAppend = store.appendMessages.bind(store);
      store.appendMessages = async () => {
        throw new Error('store down');
      };

      const ac = new AbortController();
      const syncPromise = runtime.syncRun(
        { threadId: thread.id, input: { messages: [{ role: 'user', content: 'Hi' }] } },
        ac.signal,
      );
      await waitUntil(() => yielded);
      ac.abort();
      // Should resolve with a snapshot instead of rejecting
      const result = await syncPromise;
      assert(result.id.startsWith('run_'));

      // Thread append failed — state is empty, but the abort path completed cleanly
      store.appendMessages = origAppend;
    });
  });
});
