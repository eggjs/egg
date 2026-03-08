import assert from 'node:assert/strict';

import type { RunRecord, MessageObject } from '@eggjs/tegg-types/agent-runtime';
import { RunStatus, AgentObjectType, AgentErrorCode } from '@eggjs/tegg-types/agent-runtime';
import { InvalidRunStateTransitionError } from '@eggjs/tegg-types/agent-runtime';
import { describe, it } from 'vitest';

import { RunBuilder } from '../src/RunBuilder.ts';
import type { RunUsage } from '../src/RunBuilder.ts';

function makeRunRecord(overrides?: Partial<RunRecord>): RunRecord {
  return {
    id: 'run_1',
    object: AgentObjectType.ThreadRun,
    thread_id: 'thread_1',
    status: RunStatus.Queued,
    input: [{ role: 'user', content: 'hello' }],
    created_at: 1000,
    ...overrides,
  };
}

describe('RunBuilder', () => {
  // ─── create + snapshot ───

  describe('create and snapshot', () => {
    it('should create from a queued RunRecord and produce a valid snapshot', () => {
      const record = makeRunRecord();
      const rb = RunBuilder.create(record, 'thread_1');
      const snap = rb.snapshot();

      assert.equal(snap.id, 'run_1');
      assert.equal(snap.object, AgentObjectType.ThreadRun);
      assert.equal(snap.created_at, 1000);
      assert.equal(snap.thread_id, 'thread_1');
      assert.equal(snap.status, RunStatus.Queued);
      assert.equal(snap.started_at, null);
      assert.equal(snap.completed_at, null);
      assert.equal(snap.cancelled_at, null);
      assert.equal(snap.failed_at, null);
      assert.equal(snap.usage, null);
      assert.equal(snap.last_error, undefined);
    });

    it('should restore all mutable fields from a completed RunRecord', () => {
      const record = makeRunRecord({
        status: RunStatus.Completed,
        started_at: 1001,
        completed_at: 1002,
        output: [{ id: 'msg_1', object: 'thread.message', created_at: 1001 }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        metadata: { key: 'value' },
        config: { max_iterations: 10 },
      });
      const snap = RunBuilder.create(record, 'thread_1').snapshot();

      assert.equal(snap.status, RunStatus.Completed);
      assert.equal(snap.started_at, 1001);
      assert.equal(snap.completed_at, 1002);
      assert.equal(snap.output?.length, 1);
      assert.deepStrictEqual(snap.usage, { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
      assert.deepStrictEqual(snap.metadata, { key: 'value' });
      assert.deepStrictEqual(snap.config, { max_iterations: 10 });
    });

    it('should restore failed state with last_error', () => {
      const record = makeRunRecord({
        status: RunStatus.Failed,
        started_at: 1001,
        failed_at: 1003,
        last_error: { code: 'EXEC_ERROR', message: 'boom' },
      });
      const snap = RunBuilder.create(record, 'thread_1').snapshot();

      assert.equal(snap.status, RunStatus.Failed);
      assert.equal(snap.failed_at, 1003);
      assert.deepStrictEqual(snap.last_error, { code: 'EXEC_ERROR', message: 'boom' });
    });
  });

  // ─── start ───

  describe('start', () => {
    it('should transition queued → in_progress', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      const update = rb.start();

      assert.equal(update.status, RunStatus.InProgress);
      assert.equal(typeof update.started_at, 'number');
      assert.equal(rb.snapshot().status, RunStatus.InProgress);
    });

    it('should throw for non-queued status', () => {
      const rb = RunBuilder.create(makeRunRecord({ status: RunStatus.InProgress }), 'thread_1');
      assert.throws(() => rb.start(), InvalidRunStateTransitionError);
    });
  });

  // ─── complete ───

  describe('complete', () => {
    it('should transition in_progress → completed with output and usage', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const output: MessageObject[] = [{ id: 'msg_1', object: 'thread.message', created_at: 1001 }];
      const usage: RunUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
      const update = rb.complete(output, usage);

      assert.equal(update.status, RunStatus.Completed);
      assert.equal(typeof update.completed_at, 'number');
      assert.deepStrictEqual(update.usage, {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });
      assert.equal(update.output, output);

      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Completed);
      assert.deepStrictEqual(snap.usage, {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });
    });

    it('should complete without usage', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const update = rb.complete([]);
      assert.equal(update.status, RunStatus.Completed);
      assert.equal(update.usage, undefined);

      const snap = rb.snapshot();
      assert.equal(snap.usage, null);
    });

    it('should throw for non-in_progress status', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      assert.throws(() => rb.complete([]), InvalidRunStateTransitionError);
    });
  });

  // ─── fail ───

  describe('fail', () => {
    it('should transition in_progress → failed with error', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();

      const update = rb.fail(new Error('something broke'));
      assert.equal(update.status, RunStatus.Failed);
      assert.equal(typeof update.failed_at, 'number');
      assert.deepStrictEqual(update.last_error, {
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

    it('should throw for terminal status', () => {
      const rb = RunBuilder.create(makeRunRecord({ status: RunStatus.Completed }), 'thread_1');
      assert.throws(() => rb.fail(new Error('nope')), InvalidRunStateTransitionError);
    });
  });

  // ─── cancelling ───

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

  // ─── cancel ───

  describe('cancel', () => {
    it('should transition cancelling → cancelled', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      rb.cancelling();

      const update = rb.cancel();
      assert.equal(update.status, RunStatus.Cancelled);
      assert.equal(typeof update.cancelled_at, 'number');

      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Cancelled);
      assert.equal(typeof snap.cancelled_at, 'number');
    });

    it('should throw when not in cancelling status', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      rb.start();
      assert.throws(() => rb.cancel(), InvalidRunStateTransitionError);
    });
  });

  // ─── full lifecycle ───

  describe('full lifecycle', () => {
    it('should support queued → in_progress → completed', () => {
      const rb = RunBuilder.create(makeRunRecord(), 'thread_1');
      assert.equal(rb.snapshot().status, RunStatus.Queued);

      rb.start();
      assert.equal(rb.snapshot().status, RunStatus.InProgress);

      rb.complete([], { promptTokens: 1, completionTokens: 2, totalTokens: 3 });
      const snap = rb.snapshot();
      assert.equal(snap.status, RunStatus.Completed);
      assert.ok(snap.started_at);
      assert.ok(snap.completed_at);
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
