import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { HTTPPriorityUtil } from '../../src/index.js';

describe('test/util/HTTPPriority.test.ts', () => {
  describe('path has no regexp', () => {
    it('should eqs 100000', () => {
      assert.equal(HTTPPriorityUtil.calcPathPriority('/'), HTTPPriorityUtil.DEFAULT_PRIORITY);
      assert.equal(HTTPPriorityUtil.calcPathPriority('/users'), HTTPPriorityUtil.DEFAULT_PRIORITY);
    });
  });

  describe('path has regexp', () => {
    describe('path has less than 10 /', () => {
      it('should works', () => {
        assert.equal(HTTPPriorityUtil.calcPathPriority('/*'), 0);
        assert.equal(HTTPPriorityUtil.calcPathPriority('/users/:id'), 1000);
        assert.equal(HTTPPriorityUtil.calcPathPriority('/users/:id/moments/:momentId'), 4000);
      });
    });
  });
});
