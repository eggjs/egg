import assert from 'node:assert/strict';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { NameUtil } from '../src/index.js';

describe('test/NameUtil.test.ts', () => {
  it('should work', () => {
    class Hello {}
    const name = NameUtil.getClassName(Hello);
    assert(name === 'hello');
  });
});
