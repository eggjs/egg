import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import util from 'node:util';

import context from '../test-helpers/context.ts';

describe('req.inspect()', () => {
  describe('with no request.req present', () => {
    it('should return null', () => {
      const request = context().request;
      request.method = 'GET';
      delete (request as unknown as { req: unknown }).req;
      assert.ok(undefined === request.inspect());
      assert.ok(util.inspect(request) === 'undefined');
    });
  });

  it('should return a json representation', () => {
    const request = context().request;
    request.method = 'GET';
    request.url = 'example.com';
    request.header.host = 'example.com';

    const expected = {
      method: 'GET',
      url: 'example.com',
      header: {
        host: 'example.com',
      },
    };

    assert.deepEqual(request.inspect(), expected);
    assert.deepEqual(util.inspect(request), util.inspect(expected));
  });
});
