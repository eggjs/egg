import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { TimerUtil } from '../src/index.js';

describe('test/TimerUtil.test.ts', () => {
  it('should sleep work', async () => {
    const start = Date.now();
    await TimerUtil.sleep(3);
    const use = Date.now() - start;
    assert(use > 1, `use time ${use}ms`);
  });
});
