import assert from 'node:assert';

import type { RunRecord } from '@eggjs/tegg-types/agent-runtime';
import {
  RunStatus,
  AgentObjectType,
  AgentErrorCode,
  InvalidRunStateTransitionError,
} from '@eggjs/tegg-types/agent-runtime';
import { describe, it } from 'vitest';

import { RunBuilder } from '../src/RunBuilder.ts';
import type { RunUsage } from '../src/RunBuilder.ts';

function makeRunRecord(overrides?: Partial<RunRecord>): RunRecord {
  return {
    id: 'run_1',
    object: AgentObjectType.ThreadRun,
    threadId: 'thread_1',
    status: RunStatus.Queued,
    input: [{ role: 'user', content: 'hello' }],
    createdAt: 1000,
    ...overrides,
  };
}

describe('test/RunBuilder.test.ts', () => {
  describe('create and snapshot', () => {
    it('should create from a queued RunRecord and produce a valid snapshot', () => {
      const record = makeRunRecord();
      const rb = RunBuilder.create(record, 'thread_1');
      const snap = rb.snapshot();

      assert.equal(snap.id, 'run_1');
      assert.equal(snap.object, AgentObjectType.ThreadRun);
      assert.equal(snap.createdAt, 1000);
      assert.equal(snap.threadId, 'thread_1');
      assert.equal(snap.status, RunStatus.Queued);
      assert.equal(snap.startedAt, null);
      assert.equal(snap.completedAt, null);
      assert.equal(snap.cancelledAt, null);
      assert.equal(snap.failedAt, null);
      assert.equal(snap.usage, null);
      assert.equal(snap.lastError, undefined);
    });

    it('should restore all mutable fields from a completed RunRecord', () => {
      const record = makeRunRecord({
        status: RunStatus.Completed,
        startedAt: 1001,
        completedAt: 1002,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        metadata: { key: 'value' },
        config: { maxIterations: 10 },
      });
      const snap = RunBuilder.create(record, 'thread_1').snapshot();

      assert.equal(snap.status, RunStatus.Completed);
      assert.equal(snap.startedAt, 1001);
      assert.equal(snap.completedAt, 1002);
      assert.deepStrictEqual(snap.usage, { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
      assert.deepStrictEqual(snap.metadata, { key: 'value' });
      assert.deepStrictEqual(snap.config, { maxIterations: 10 });
    });

    it('should restore failed state with lastError', () => {
      const record = makeRunRecord({
        status: RunStatus.Failed,
        startedAt: 1001,
        failedAt: 1003,
        lastError: { code: 'EXEC_ERROR', message: 'boom' },
      });
      const snap = RunBuilder.create(record, 'thread_1').snapshot();

      assert.equal(snap.status, RunStatus.Failed);
      assert.equal(snap.failedAt, 1003);
      assert.deepStrictEqual(snap.lastError, { code: 'EXEC_ERROR', message: 'boom' });
    });
  });

  describe('start', () => {
    it('should transition queued → in_progress', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      const update = rb.start();

      assert.equal(update.status, RunStatus.InProgress);
      assert.equal(typeof update.startedAt, 'number');
      assert.equal(rb.snapshot().status, RunStatus.InProgress);
    });

    it('should throw for non-queued status', () => {
      const rb = RunBuilder.create(makeRunRecord({ status: RunStatus.InProgress }), 'thread_1');
      assert.throws(() => rb.start(), InvalidRunStateTransitionError);
    });
  });

  describe('complete', () => {
    it('should transition in_progress → completed with usage', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const usage: RunUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
      const update = rb.complete(usage);

      assert.equal(update.status, RunStatus.Completed);
      assert.equal(typeof update.completedAt, 'number');
      assert.deepStrictEqual(update.usage, {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });

      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Completed);
      assert.deepStrictEqual(snap.usage, {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it('should complete without usage', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const update = rb.complete();
      assert.equal(update.status, RunStatus.Completed);
      assert.equal(update.usage, undefined);

      const snap = rb.snapshot();
      assert.equal(snap.usage, null);
    });

    it('should throw for non-in_progress status', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      assert.throws(() => rb.complete(), InvalidRunStateTransitionError);
    });
  });

  describe('fail', () => {
    it('should transition in_progress → failed with error', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const update = rb.fail(new Error('something broke'));
      assert.equal(update.status, RunStatus.Failed);
      assert.equal(typeof update.failedAt, 'number');
      assert.deepStrictEqual(update.lastError, {
        code: AgentErrorCode.ExecError,
        message: 'something broke',
      });

      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Failed);
    });

    it('should allow failing from queued status', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      const update = rb.fail(new Error('early failure'));
      assert.equal(update.status, RunStatus.Failed);
    });

    it('should allow failing from cancelling status (cancel watchdog timeout)', () => {
      const rb = RunBuilder.create(makeRunRecord({ status: RunStatus.Cancelling }), 'thread_1');
      const update = rb.fail(new Error('commit timeout'));
      assert.equal(update.status, RunStatus.Failed);
    });

    it('should throw for terminal status', () => {
      const rb = RunBuilder.create(makeRunRecord({ status: RunStatus.Completed }), 'thread_1');
      assert.throws(() => rb.fail(new Error('nope')), InvalidRunStateTransitionError);
    });
  });

  describe('cancelling', () => {
    it('should transition in_progress → cancelling', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const update = rb.cancelling();
      assert.equal(update.status, RunStatus.Cancelling);
      assert.equal(rb.snapshot().status, RunStatus.Cancelling);
    });

    it('should transition queued → cancelling', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      const update = rb.cancelling();
      assert.equal(update.status, RunStatus.Cancelling);
    });

    it('should be idempotent when already cancelling', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      rb.cancelling();
      const update = rb.cancelling();
      assert.equal(update.status, RunStatus.Cancelling);
    });

    it('should throw for terminal status', () => {
      const rb = RunBuilder.create(makeRunRecord({ status: RunStatus.Completed }), 'thread_1');
      assert.throws(() => rb.cancelling(), InvalidRunStateTransitionError);
    });
  });

  describe('cancel', () => {
    it('should transition cancelling → cancelled', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      rb.cancelling();

      const update = rb.cancel();
      assert.equal(update.status, RunStatus.Cancelled);
      assert.equal(typeof update.cancelledAt, 'number');

      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Cancelled);
      assert.equal(typeof snap.cancelledAt, 'number');
    });

    it('should throw when not in cancelling status', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      assert.throws(() => rb.cancel(), InvalidRunStateTransitionError);
    });
  });

  describe('full lifecycle', () => {
    it('should support queued → in_progress → completed', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      assert.equal(rb.snapshot().status, RunStatus.Queued);

      rb.start();
      assert.equal(rb.snapshot().status, RunStatus.InProgress);

      rb.complete({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Completed);
      assert.ok(snap.startedAt);
      assert.ok(snap.completedAt);
    });

    it('should support queued → in_progress → cancelling → cancelled', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      rb.cancelling();
      rb.cancel();
      assert.equal(rb.snapshot().status, RunStatus.Cancelled);
    });

    it('should support queued → in_progress → failed', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      rb.fail(new Error('err'));
      assert.equal(rb.snapshot().status, RunStatus.Failed);
    });
  });
});
