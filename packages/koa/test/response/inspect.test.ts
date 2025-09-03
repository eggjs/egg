import util from 'node:util';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { response } from '../test-helpers/context.ts';

describe('res.inspect()', () => {
  describe('with no response.res present', () => {
    it('should return null', () => {
      const res = response();
      res.body = 'hello';
      // @ts-expect-error for testing
      delete res.res;
      assert.equal(res.inspect(), undefined);
      assert.equal(util.inspect(res), 'undefined');
    });
  });

  it('should return a json representation', () => {
    const res = response();
    res.body = 'hello';

    const expected = {
      status: 200,
      message: 'OK',
      header: {
        'content-type': 'text/plain; charset=utf-8',
        'content-length': '5',
      },
      body: 'hello',
    };

    assert.deepEqual(res.inspect(), expected);
    assert.deepEqual(util.inspect(res), util.inspect(expected));
  });
});
