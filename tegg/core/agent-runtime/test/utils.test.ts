import assert from 'node:assert';

import { describe, it } from 'vitest';

import { newMsgId, nowUnix } from '../src/AgentStoreUtils.ts';

describe('test/utils.test.ts', () => {
  it('nowUnix should return current unix timestamp in seconds', () => {
    const before = Math.floor(Date.now() / 1000);
    const result = nowUnix();
    const after = Math.floor(Date.now() / 1000);
    assert(result >= before);
    assert(result <= after);
  });

  it('newMsgId should return msg_ prefixed UUID', () => {
    const id = newMsgId();
    assert(id.startsWith('msg_'));
    assert.equal(id.length, 'msg_'.length + 36); // UUID is 36 chars
  });

  it('newMsgId should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 10 }, () => newMsgId()));
    assert.equal(ids.size, 10);
  });
});
