import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { response } from '../test-helpers/context.ts';

describe('res.header', () => {
  it('should return the response header object', () => {
    const res = response();
    res.set('X-Foo', 'bar');
    assert.deepEqual(res.headers, { 'x-foo': 'bar' });
  });

  describe('when res._headers not present', () => {
    it('should return empty object', () => {
      const res = response();
      // @ts-expect-error for testing
      res.res._headers = null;
      assert.deepEqual(res.headers, {});
    });
  });
});
