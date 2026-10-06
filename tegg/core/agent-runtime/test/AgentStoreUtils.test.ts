import assert from 'node:assert';

import { describe, it } from 'vitest';

import { TS_MAX_MS, dateBucket, reverseMs } from '../src/index.ts';

describe('test/AgentStoreUtils.test.ts', () => {
  describe('TS_MAX_MS', () => {
    it('is the 13-digit millisecond timestamp ceiling', () => {
      assert.strictEqual(TS_MAX_MS, 9_999_999_999_999);
      assert.strictEqual(String(TS_MAX_MS).length, 13);
      const isoOfCeiling = new Date(TS_MAX_MS).toISOString();
      assert.match(isoOfCeiling, /^2286-/);
    });
  });

  describe('reverseMs', () => {
    it('produces a 13-character zero-padded decimal string', () => {
      assert.strictEqual(reverseMs(0), '9999999999999');
      assert.strictEqual(reverseMs(TS_MAX_MS), '0000000000000');
      assert.strictEqual(reverseMs(1), String(TS_MAX_MS - 1).padStart(13, '0'));
      assert.strictEqual(reverseMs(1).length, 13);
    });

    it('matches the worked example timestamp from the PR description', () => {
      const knownMs = Date.UTC(2025, 10, 13, 8, 0, 0, 0);
      assert.strictEqual(knownMs, 1_763_020_800_000);
      assert.strictEqual(reverseMs(knownMs), '8236979199999');
    });

    it('throws RangeError for non-integer, negative, or out-of-range ms', () => {
      assert.throws(() => reverseMs(-1), RangeError);
      assert.throws(() => reverseMs(TS_MAX_MS + 1), RangeError);
      assert.throws(() => reverseMs(1.5), RangeError);
      assert.throws(() => reverseMs(Number.NaN), RangeError);
      assert.throws(() => reverseMs(Number.POSITIVE_INFINITY), RangeError);
      assert.throws(() => reverseMs(Number.NEGATIVE_INFINITY), RangeError);
    });

    it('is strictly monotonically decreasing in lex order versus the input', () => {
      const pairs: Array<[number, number]> = [
        [0, 1],
        [0, TS_MAX_MS],
        [1, 2],
        [1_000, 1_001],
        [1_762_992_000_000, 1_763_078_400_000], // one day apart in November 2025
        [Date.UTC(2025, 0, 1), Date.UTC(2026, 0, 1)],
        [Math.floor(Date.now() / 2), Date.now()],
        [TS_MAX_MS - 1, TS_MAX_MS],
      ];
      for (const [a, b] of pairs) {
        assert.ok(a < b, `precondition: ${a} < ${b}`);
        const ra = reverseMs(a);
        const rb = reverseMs(b);
        assert.strictEqual(ra.length, 13);
        assert.strictEqual(rb.length, 13);
        assert.ok(ra > rb, `monotonicity broken for a=${a} b=${b}: reverseMs(a)=${ra} should be > reverseMs(b)=${rb}`);
      }
    });
  });

  describe('dateBucket', () => {
    it('uses UTC and produces YYYY-MM-DD', () => {
      assert.strictEqual(dateBucket(0), '1970-01-01');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 0, 0, 0, 0)), '2025-11-13');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 12, 34, 56, 789)), '2025-11-13');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 23, 59, 59, 999)), '2025-11-13');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 23, 59, 59, 999) + 1), '2025-11-14');
    });

    it('rejects non-finite, non-integer, or negative ms inputs with a RangeError', () => {
      assert.throws(() => dateBucket(Number.NaN), RangeError);
      assert.throws(() => dateBucket(Number.POSITIVE_INFINITY), RangeError);
      assert.throws(() => dateBucket(Number.NEGATIVE_INFINITY), RangeError);
      assert.throws(() => dateBucket(1.5), RangeError, 'a fractional ms is out of contract');
      assert.throws(() => dateBucket(-1), RangeError, 'a pre-epoch negative ms is out of contract');
      assert.doesNotThrow(() => dateBucket(-0), 'signed -0 collapses to the epoch instant');
      assert.strictEqual(dateBucket(-0), dateBucket(0));
    });
  });
});
