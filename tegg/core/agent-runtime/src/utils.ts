import crypto from 'node:crypto';

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function newMsgId(): string {
  return `msg_${crypto.randomUUID()}`;
}
