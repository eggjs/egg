import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { ContextController } from './fixtures/ContextController.js';
import { MethodInfoUtil } from '../src/util/index.js';

describe('test/Context.test.ts', () => {
  it('should work', () => {
    const contextIndex = MethodInfoUtil.getMethodContextIndex(ContextController, 'hello');
    assert.equal(contextIndex, 0);
  });
});
