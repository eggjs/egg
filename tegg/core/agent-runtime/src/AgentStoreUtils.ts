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
