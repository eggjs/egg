import assert from 'node:assert/strict';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { describe, it } from 'vite-plus/test';

import { FooController } from './fixtures/HTTPFooController.js';

describe('test/decorators.test.ts', () => {
  describe('', () => {
    it('should get the right file path', () => {
      console.warn(FooController.fileName);
      console.warn(PrototypeUtil.getFilePath(FooController));
      assert.equal(PrototypeUtil.getFilePath(FooController), FooController.fileName);
    });
  });
});
