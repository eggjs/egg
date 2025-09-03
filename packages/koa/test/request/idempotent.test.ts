import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { request } from '../test-helpers/context.ts';

describe('ctx.idempotent', () => {
  describe('when the request method is idempotent', () => {
    it('should return true', () => {
      for (const method of [
        'GET',
        'HEAD',
        'PUT',
        'DELETE',
        'OPTIONS',
        'TRACE',
      ]) {
        const req = request();
        req.method = method;
        assert.equal(req.idempotent, true);
      }
    });
  });

  describe('when the request method is not idempotent', () => {
    it('should return false', () => {
      const req = request();
      req.method = 'POST';
      assert.equal(req.idempotent, false);
    });
  });
});
