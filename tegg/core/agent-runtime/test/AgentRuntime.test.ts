import { strict as assert } from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import { RunStatus, AgentSSEEvent, AgentObjectType } from '@eggjs/tegg-types/agent-runtime';
import type {
  ObjectStorageClient,
  RunRecord,
  CreateRunInput,
  AgentStreamMessage,
  AgentStreamMessagePayload,
  InputContentPart,
  MessageContentBlock,
} from '@eggjs/tegg-types/agent-runtime';
import {
  AgentNotFoundError,
  AgentConflictError,
  InvalidRunStateTransitionError,
} from '@eggjs/tegg-types/agent-runtime';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentRuntime } from '../src/AgentRuntime.ts';
import type { AgentExecutor, AgentRuntimeOptions } from '../src/AgentRuntime.ts';
import { MessageConverter } from '../src/MessageConverter.ts';
import { OSSAgentStore } from '../src/OSSAgentStore.ts';
import { RunBuilder } from '../src/RunBuilder.ts';
import type { SSEWriter } from '../src/SSEWriter.ts';

// ── Test helpers ──────────────────────────────────────────────────────

/**
 * In-memory ObjectStorageClient for testing.
 * Supports put/get/append — mirrors the contract used by OSSAgentStore.
 */
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

/**
 * In-memory ObjectStorageClient WITHOUT append — for testing the fallback path.
 */
class MapStorageClientWithoutAppend implements ObjectStorageClient {
  private readonly store = new Map<string, string>();

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
}

/** Create a minimal RunRecord for RunBuilder tests. */
function makeRunRecord(overrides?: Partial<RunRecord>): RunRecord {
  return {
    id: 'run_test',
    object: AgentObjectType.ThreadRun,
    thread_id: 'thread_test',
    status: RunStatus.Queued,
    input: [{ role: 'user', content: 'hi' }],
    created_at: 1000,
    ...overrides,
  };
}

/** Mock SSEWriter that records events in-memory for assertions. */
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

  /** Simulate client disconnect. */
  simulateClose(): void {
    this.closed = true;
    for (const cb of this.closeCallbacks) cb();
  }
}

/** Poll store until the run reaches (or passes) the expected status. */
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

/** Helper to create a properly typed execRun that waits and can be aborted. */
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

/** Helper to create an execRun that waits for external resolution. */
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

// ── Tests ─────────────────────────────────────────────────────────────

describe('core/agent-runtime/test/AgentRuntime.test.ts', () => {
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
            role: 'assistant',
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
        yield {
          usage: { prompt_tokens: 10, completion_tokens: 5 },
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
      assert.equal(result.object, 'thread');
      assert(typeof result.created_at === 'number');
      // Unix seconds
      assert(result.created_at <= Math.floor(Date.now() / 1000));
      assert(typeof result.metadata === 'object');
    });
  });

  describe('getThread', () => {
    it('should get a thread by id', async () => {
      const created = await runtime.createThread();

      const result = await runtime.getThread(created.id);
      assert.equal(result.id, created.id);
      assert.equal(result.object, 'thread');
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
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'completed');
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));
      assert.equal(result.output!.length, 1);
      assert.equal(result.output![0].object, 'thread.message');
      assert.equal(result.output![0]['role'], 'assistant');
      assert.equal(result.output![0]['status'], 'completed');
      const content = result.output![0]['content'] as MessageContentBlock[];
      assert.equal(content[0].type, 'text');
      assert.equal(content[0].text.value, 'Hello 1 messages');
      assert(Array.isArray(content[0].text.annotations));
      assert.equal(result.usage!.prompt_tokens, 10);
      assert.equal(result.usage!.completion_tokens, 5);
      assert.equal(result.usage!.total_tokens, 15);
      assert(result.started_at! >= result.created_at, 'started_at should be >= created_at');
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { user_id: 'u_1', trace: 'xyz' };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepEqual(result.metadata, meta);

      // Verify stored in store
      const run = await store.getRun(result.id);
      assert.deepEqual(run.metadata, meta);
    });

    it('should store the run in the store', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      const run = await store.getRun(result.id);
      assert.equal(run.status, 'completed');
      assert(run.completed_at);
    });

    it('should append messages to thread when thread_id provided', async () => {
      const thread = await runtime.createThread();

      await runtime.syncRun({
        thread_id: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2); // user + assistant
      assert.equal(updated.messages[0]['role'], 'user');
      assert.equal(updated.messages[1]['role'], 'assistant');
    });

    it('should auto-create thread and append messages when thread_id not provided', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));

      // Verify thread was created and messages were appended
      const thread = await runtime.getThread(result.thread_id);
      assert.equal(thread.messages.length, 2); // user + assistant
      assert.equal(thread.messages[0]['role'], 'user');
      assert.equal(thread.messages[1]['role'], 'assistant');
    });

    it('should not throw when store.updateRun fails in catch block', async () => {
      // execRun throws an error
      host.execRun = async function* (): AsyncGenerator<AgentStreamMessage> {
        throw new Error('exec failed');
      };

      // Make store.updateRun fail on the fail() update
      let callCount = 0;
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        callCount++;
        // Fail on second call (the fail() update in catch block)
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
    it('should return queued status immediately with auto-created thread_id', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'queued');
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));
    });

    it('should complete the run in the background', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Wait for background task to complete naturally
      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, 'completed');
      const outputContent = run.output![0]['content'] as MessageContentBlock[];
      assert.equal(outputContent[0].text.value, 'Hello 1 messages');
    });

    it('should auto-create thread and append messages when thread_id not provided', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.thread_id);

      // Wait for background task to complete naturally
      await runtime.waitForPendingTasks();

      // Verify thread was created and messages were appended
      const thread = await store.getThread(result.thread_id);
      assert.equal(thread.messages.length, 2); // user + assistant
      assert.equal(thread.messages[0]['role'], 'user');
      assert.equal(thread.messages[1]['role'], 'assistant');
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { session: 'sess_1' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepEqual(result.metadata, meta);

      // Wait for background task to complete naturally
      await runtime.waitForPendingTasks();

      // Verify stored in store
      const run = await store.getRun(result.id);
      assert.deepEqual(run.metadata, meta);
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
      // Use a slow execRun that can be aborted; it notifies via
      // yieldedPromise when the first chunk has been yielded so the
      // test can disconnect at a deterministic point.
      let resolveYielded!: () => void;
      const yieldedPromise = new Promise<void>((r) => {
        resolveYielded = r;
      });

      host.execRun = async function* (
        _input: CreateRunInput,
        signal?: AbortSignal,
      ): AsyncGenerator<AgentStreamMessage> {
        yield { message: { role: 'assistant', content: [{ type: 'text', text: 'start' }] } };
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

      // Start streamRun but simulate disconnect after the first chunk is yielded
      const streamPromise = runtime.streamRun({ input: { messages: [{ role: 'user', content: 'Hi' }] } }, writer);

      await yieldedPromise;
      writer.simulateClose();

      await streamPromise;

      const eventNames = writer.events.map((e) => e.event);
      // Should have run.created and run.in_progress, then cancelled
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
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'completed');
      assert(typeof result.created_at === 'number');
    });

    it('should return metadata from getRun', async () => {
      const meta = { source: 'api' };
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });

      const result = await runtime.getRun(syncResult.id);
      assert.deepEqual(result.metadata, meta);
    });
  });

  describe('cancelRun', () => {
    it('should cancel a run', async () => {
      // Use a signal-aware execRun so abort takes effect
      host.execRun = createSlowExecRun([
        {
          message: { role: 'assistant', content: [{ type: 'text', text: 'start' }] },
        },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Wait for background task to reach in_progress deterministically
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      const cancelResult = await runtime.cancelRun(result.id);
      assert.equal(cancelResult.id, result.id);
      assert.equal(cancelResult.object, 'thread.run');
      assert.equal(cancelResult.status, 'cancelled');

      const run = await store.getRun(result.id);
      assert.equal(run.status, 'cancelled');
      assert(run.cancelled_at);
    });

    it('should write cancelling then cancelled to store', async () => {
      // Use a slow execRun so the run stays in in_progress long enough to cancel
      host.execRun = createSlowExecRun([
        {
          message: { role: 'assistant', content: [{ type: 'text', text: 'start' }] },
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
      statusHistory.length = 0; // Reset to only capture cancelRun writes

      await runtime.cancelRun(asyncResult.id);

      const cancellingIdx = statusHistory.indexOf('cancelling');
      const cancelledIdx = statusHistory.indexOf('cancelled');
      assert(cancellingIdx >= 0, 'cancelling should have been written');
      assert(cancelledIdx > cancellingIdx, 'cancelled should come after cancelling');
    });

    it('should throw AgentConflictError when cancelling a completed run', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert.equal(result.status, 'completed');

      await assert.rejects(
        () => runtime.cancelRun(result.id),
        (err: unknown) => {
          assert(err instanceof AgentConflictError);
          return true;
        },
      );
    });

    it('should not overwrite cancelling status with completed (cross-worker scenario)', async () => {
      // Simulate: asyncRun starts on this runtime, but another worker cancels via store
      const resolveRef: { resolve?: () => void } = {};
      host.execRun = createBlockingExecRun(resolveRef, [
        {
          message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
        },
        {
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Wait for background task to reach in_progress deterministically
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      // Simulate another worker writing "cancelling" directly to store
      await store.updateRun(result.id, { status: RunStatus.Cancelling });

      // Let the execRun complete
      resolveRef.resolve!();
      await runtime.waitForPendingTasks();

      // The background task should have detected cancelling and NOT overwritten with completed
      const run = await store.getRun(result.id);
      assert.equal(run.status, 'cancelling', 'status should remain cancelling, not overwritten to completed');
    });

    it('should not overwrite terminal state when run completes during cancellation (TOCTOU)', async () => {
      // Scenario: cancelRun writes cancelling, then between the cancelling write and
      // the cancelled write, the run completes. The re-read check should detect this.
      const resolveRef: { resolve?: () => void } = {};
      host.execRun = createBlockingExecRun(resolveRef, [
        {
          message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
        },
        { usage: { prompt_tokens: 1, completion_tokens: 1 } },
      ]);

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      // Wait for background task to reach in_progress deterministically
      await waitForRunStatus(store, result.id, RunStatus.InProgress);

      // Intercept store.updateRun: after writing 'cancelling', simulate the run completing
      // in the store (as if the background task finished between cancelling and cancelled writes)
      const origUpdateRun = store.updateRun.bind(store);
      store.updateRun = async (runId: string, updates: Partial<RunRecord>) => {
        await origUpdateRun(runId, updates);
        if (updates.status === RunStatus.Cancelling) {
          // Simulate the background task completing in the store
          await origUpdateRun(runId, { status: RunStatus.Completed, completed_at: Math.floor(Date.now() / 1000) });
          // Restore original to avoid infinite interception
          store.updateRun = origUpdateRun;
        }
      };

      // Let execRun finish so it doesn't block cancelRun's await task.promise
      resolveRef.resolve!();

      const cancelResult = await runtime.cancelRun(result.id);
      // The TOCTOU re-read should detect that the run is now completed
      assert.equal(cancelResult.status, 'completed');
    });
  });
});

// ── RunBuilder state machine tests ────────────────────────────────────

describe('RunBuilder', () => {
  describe('state transitions', () => {
    it('should allow Queued -> InProgress -> Completed', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      const startUpdate = rb.start();
      assert.equal(startUpdate.status, RunStatus.InProgress);
      assert(startUpdate.started_at);

      const completeUpdate = rb.complete([], { promptTokens: 1, completionTokens: 2, totalTokens: 3 });
      assert.equal(completeUpdate.status, RunStatus.Completed);
      assert(completeUpdate.completed_at);
      assert.deepEqual(completeUpdate.usage, { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 });
    });

    it('should allow Queued -> InProgress -> Failed', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      const failUpdate = rb.fail(new Error('oops'));
      assert.equal(failUpdate.status, RunStatus.Failed);
      assert(failUpdate.failed_at);
      assert.equal(failUpdate.last_error!.message, 'oops');
    });

    it('should allow Queued -> Failed (start itself might throw)', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      const failUpdate = rb.fail(new Error('store down'));
      assert.equal(failUpdate.status, RunStatus.Failed);
    });

    it('should allow Queued -> InProgress -> Cancelling -> Cancelled', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      const cancellingUpdate = rb.cancelling();
      assert.equal(cancellingUpdate.status, RunStatus.Cancelling);

      const cancelUpdate = rb.cancel();
      assert.equal(cancelUpdate.status, RunStatus.Cancelled);
      assert(cancelUpdate.cancelled_at);
    });

    it('should allow Queued -> Cancelling -> Cancelled', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.cancelling();
      const cancelUpdate = rb.cancel();
      assert.equal(cancelUpdate.status, RunStatus.Cancelled);
    });

    it('should allow idempotent cancelling() when already in Cancelling state', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      rb.cancelling();
      // Second call should be idempotent, not throw
      const update = rb.cancelling();
      assert.equal(update.status, RunStatus.Cancelling);
      // Should still be able to proceed to cancelled
      const cancelUpdate = rb.cancel();
      assert.equal(cancelUpdate.status, RunStatus.Cancelled);
    });
  });

  describe('invalid state transitions', () => {
    it('should throw on start() from non-Queued state', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start(); // Queued -> InProgress
      assert.throws(
        () => rb.start(),
        (err: unknown) => {
          assert(err instanceof InvalidRunStateTransitionError);
          assert.equal(err.status, 409);
          return true;
        },
      );
    });

    it('should throw on complete() from Queued state', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      assert.throws(
        () => rb.complete([], undefined),
        (err: unknown) => err instanceof InvalidRunStateTransitionError,
      );
    });

    it('should throw on complete() from Failed state', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      rb.fail(new Error('fail'));
      assert.throws(
        () => rb.complete([], undefined),
        (err: unknown) => err instanceof InvalidRunStateTransitionError,
      );
    });

    it('should throw on fail() from Completed state', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      rb.complete([], undefined);
      assert.throws(
        () => rb.fail(new Error('late')),
        (err: unknown) => err instanceof InvalidRunStateTransitionError,
      );
    });

    it('should throw on cancelling() from Completed state', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      rb.complete([], undefined);
      assert.throws(
        () => rb.cancelling(),
        (err: unknown) => err instanceof InvalidRunStateTransitionError,
      );
    });

    it('should throw on cancel() from InProgress state (must go through cancelling)', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_test');
      rb.start();
      assert.throws(
        () => rb.cancel(),
        (err: unknown) => err instanceof InvalidRunStateTransitionError,
      );
    });
  });

  describe('create() restores full state from RunRecord', () => {
    it('should restore started_at and status from an InProgress RunRecord', () => {
      const record = makeRunRecord({
        status: RunStatus.InProgress,
        started_at: 2000,
      });
      const rb = RunBuilder.create(record, 'thread_test');
      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.InProgress);
      assert.equal(snap.started_at, 2000);
    });

    it('should restore all timestamps and fields from a Completed RunRecord', () => {
      const record = makeRunRecord({
        status: RunStatus.Completed,
        started_at: 2000,
        completed_at: 3000,
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        output: [{ id: 'msg_1', object: 'thread.message', created_at: 2500 }],
      });
      const rb = RunBuilder.create(record, 'thread_test');
      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Completed);
      assert.equal(snap.started_at, 2000);
      assert.equal(snap.completed_at, 3000);
      assert.equal(snap.usage!.prompt_tokens, 10);
      assert.equal(snap.usage!.completion_tokens, 5);
      assert.equal(snap.usage!.total_tokens, 15);
      assert.equal(snap.output!.length, 1);
    });

    it('should restore last_error from a Failed RunRecord', () => {
      const record = makeRunRecord({
        status: RunStatus.Failed,
        started_at: 2000,
        failed_at: 3000,
        last_error: { code: 'exec_error', message: 'timeout' },
      });
      const rb = RunBuilder.create(record, 'thread_test');
      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Failed);
      assert.equal(snap.failed_at, 3000);
      assert.equal(snap.last_error!.message, 'timeout');
    });

    it('should restore cancelled_at from a Cancelled RunRecord', () => {
      const record = makeRunRecord({
        status: RunStatus.Cancelled,
        cancelled_at: 4000,
      });
      const rb = RunBuilder.create(record, 'thread_test');
      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Cancelled);
      assert.equal(snap.cancelled_at, 4000);
    });
  });
});

// ── OSSAgentStore boundary tests ──────────────────────────────────────

describe('OSSAgentStore', () => {
  describe('JSONL empty line tolerance', () => {
    it('should handle JSONL data with trailing empty lines', async () => {
      const client = new MapStorageClient();
      const agentStore = new OSSAgentStore({ client });

      // Create a thread
      const thread = await agentStore.createThread();

      // Manually write JSONL with trailing newlines (simulating append edge case)
      const msg = { id: 'msg_1', object: 'thread.message', created_at: 1000, role: 'user', content: 'hi' };
      const key = `threads/${thread.id}/messages.jsonl`;
      await client.put(key, JSON.stringify(msg) + '\n\n\n');

      const result = await agentStore.getThread(thread.id);
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0].id, 'msg_1');
    });

    it('should handle completely empty JSONL data', async () => {
      const client = new MapStorageClient();
      const agentStore = new OSSAgentStore({ client });
      const thread = await agentStore.createThread();

      // Write empty content to messages key
      const key = `threads/${thread.id}/messages.jsonl`;
      await client.put(key, '');

      const result = await agentStore.getThread(thread.id);
      assert.equal(result.messages.length, 0);
    });
  });

  describe('appendMessages empty array', () => {
    it('should return immediately for empty messages array', async () => {
      const client = new MapStorageClient();
      const agentStore = new OSSAgentStore({ client });
      const thread = await agentStore.createThread();

      // This should not throw even though messages key doesn't exist yet
      await agentStore.appendMessages(thread.id, []);

      // Verify no messages file was created
      const result = await agentStore.getThread(thread.id);
      assert.equal(result.messages.length, 0);
    });

    it('should skip thread existence check for empty messages', async () => {
      const client = new MapStorageClient();
      const agentStore = new OSSAgentStore({ client });

      // Calling with non-existent thread and empty array should not throw
      await agentStore.appendMessages('thread_nonexistent', []);
    });
  });

  describe('fallback without append method', () => {
    it('should use read-modify-write when client has no append method', async () => {
      const client = new MapStorageClientWithoutAppend();
      const agentStore = new OSSAgentStore({ client });
      const thread = await agentStore.createThread();

      const msg1 = { id: 'msg_1', object: 'thread.message', created_at: 1000 };
      const msg2 = { id: 'msg_2', object: 'thread.message', created_at: 2000 };
      await agentStore.appendMessages(thread.id, [msg1]);
      await agentStore.appendMessages(thread.id, [msg2]);

      const result = await agentStore.getThread(thread.id);
      assert.equal(result.messages.length, 2);
      assert.equal(result.messages[0].id, 'msg_1');
      assert.equal(result.messages[1].id, 'msg_2');
    });
  });
});

// ── MessageConverter tests ────────────────────────────────────────────

describe('MessageConverter', () => {
  describe('toContentBlocks', () => {
    it('should handle string content', () => {
      const blocks = MessageConverter.toContentBlocks({ content: 'hello world' });
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'text');
      assert.equal(blocks[0].text.value, 'hello world');
      assert(Array.isArray(blocks[0].text.annotations));
    });

    it('should handle array content with text parts', () => {
      const blocks = MessageConverter.toContentBlocks({
        content: [
          { type: 'text', text: 'part1' },
          { type: 'text', text: 'part2' },
        ],
      });
      assert.equal(blocks.length, 2);
      assert.equal(blocks[0].text.value, 'part1');
      assert.equal(blocks[1].text.value, 'part2');
    });

    it('should return empty array for null/undefined input', () => {
      assert.equal(MessageConverter.toContentBlocks(null as unknown as AgentStreamMessagePayload).length, 0);
      assert.equal(MessageConverter.toContentBlocks(undefined as unknown as AgentStreamMessagePayload).length, 0);
    });

    it('should filter out non-text content types', () => {
      const blocks = MessageConverter.toContentBlocks({
        content: [{ type: 'text', text: 'keep' }, { type: 'image', url: 'ignored' } as unknown as InputContentPart],
      });
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].text.value, 'keep');
    });
  });

  describe('extractFromStreamMessages', () => {
    it('should extract messages and accumulate usage', () => {
      const { output, usage } = MessageConverter.extractFromStreamMessages(
        [
          { message: { role: 'assistant', content: 'chunk1' } },
          { usage: { prompt_tokens: 10, completion_tokens: 5 } },
          { message: { role: 'assistant', content: 'chunk2' } },
          { usage: { prompt_tokens: 0, completion_tokens: 3 } },
        ],
        'run_1',
      );

      assert.equal(output.length, 2);
      assert.equal(usage!.promptTokens, 10);
      assert.equal(usage!.completionTokens, 8);
      assert.equal(usage!.totalTokens, 18);
    });

    it('should return undefined usage when no usage messages present', () => {
      const { output, usage } = MessageConverter.extractFromStreamMessages([
        { message: { role: 'assistant', content: 'hello' } },
      ]);
      assert.equal(output.length, 1);
      assert.equal(usage, undefined);
    });

    it('should handle empty message array', () => {
      const { output, usage } = MessageConverter.extractFromStreamMessages([]);
      assert.equal(output.length, 0);
      assert.equal(usage, undefined);
    });
  });

  describe('toInputMessageObjects', () => {
    it('should convert user messages to MessageObjects', () => {
      const result = MessageConverter.toInputMessageObjects([{ role: 'user' as const, content: 'hello' }], 'thread_1');
      assert.equal(result.length, 1);
      assert.equal(result[0]['role'], 'user');
      assert.equal(result[0].object, 'thread.message');
      assert.equal(result[0]['thread_id'], 'thread_1');
    });

    it('should filter out system messages', () => {
      const result = MessageConverter.toInputMessageObjects(
        [
          { role: 'system' as const, content: 'You are an assistant' },
          { role: 'user' as const, content: 'hello' },
        ],
        'thread_1',
      );
      assert.equal(result.length, 1);
      assert.equal(result[0]['role'], 'user');
    });

    it('should handle array content parts', () => {
      const result = MessageConverter.toInputMessageObjects([
        { role: 'user' as const, content: [{ type: 'text' as const, text: 'part1' }] },
      ]);
      assert.equal(result.length, 1);
      const content = result[0]['content'] as MessageContentBlock[];
      assert.equal(content[0].text.value, 'part1');
    });
  });
});
