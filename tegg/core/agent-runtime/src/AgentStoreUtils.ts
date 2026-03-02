import crypto from 'node:crypto';

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

// TODO(PR2): used by AgentRuntime and MessageConverter — remove this comment after PR2 lands
export function newMsgId(): string {
  return `msg_${crypto.randomUUID()}`;
}
