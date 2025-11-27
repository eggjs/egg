import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { MethodInfoUtil } from '../src/util/index.js';
import { ContextController } from './fixtures/ContextController.js';

describe('test/Context.test.ts', () => {
  it('should work', () => {
    const contextIndex = MethodInfoUtil.getMethodContextIndex(ContextController, 'hello');
    assert.equal(contextIndex, 0);
  });
});
