import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import context from '../test-helpers/context.ts';

describe('ctx.toJSON()', () => {
  it('should return a json representation', () => {
    const ctx = context();

    ctx.req.method = 'POST';
    ctx.req.url = '/items';
    ctx.req.headers['content-type'] = 'text/plain';
    ctx.status = 200;
    ctx.body = '<p>Hey</p>';

    // oxlint-disable-next-line unicorn/prefer-structured-clone
    const obj = JSON.parse(JSON.stringify(ctx));
    const req = obj.request;
    const res = obj.response;

    assert.deepEqual(
      {
        method: 'POST',
        url: '/items',
        header: {
          'content-type': 'text/plain',
        },
      },
      req
    );

    assert.deepEqual(
      {
        status: 200,
        message: 'OK',
        header: {
          'content-type': 'text/html; charset=utf-8',
          'content-length': '10',
        },
      },
      res
    );
  });
});
