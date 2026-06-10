import crypto from 'node:crypto';

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function newMsgId(): string {
  return `msg_${crypto.randomUUID()}`;
}

export function newThreadId(): string {
  return `thread_${crypto.randomUUID()}`;
}

export function newRunId(): string {
  return `run_${crypto.randomUUID()}`;
}

/**
 * Upper bound for 13-digit millisecond timestamps. The time complement
 * `TS_MAX_MS - ms` sorts newest-first in ascending key order.
 */
export const TS_MAX_MS = 9_999_999_999_999;

const REV_MS_WIDTH = String(TS_MAX_MS).length;

/**
 * Encode a millisecond timestamp so ascending key order is newest-first.
 */
export function reverseMs(ms: number): string {
  if (!Number.isInteger(ms) || ms < 0 || ms > TS_MAX_MS) {
    throw new RangeError(`reverseMs: ms must be an integer in [0, ${TS_MAX_MS}], got ${ms}`);
  }
  return String(TS_MAX_MS - ms).padStart(REV_MS_WIDTH, '0');
}

/**
 * Format a Unix-millisecond timestamp as a UTC `YYYY-MM-DD` bucket.
 */
export function dateBucket(ms: number): string {
  if (!Number.isInteger(ms) || ms < 0) {
    throw new RangeError(`dateBucket: ms must be a nonnegative integer Unix-millisecond timestamp, got ${ms}`);
  }
  return new Date(ms).toISOString().slice(0, 10);
}
