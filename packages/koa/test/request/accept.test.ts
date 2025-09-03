import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import accepts from 'accepts';

import context, { request as createRequest } from '../test-helpers/context.ts';

describe('ctx.accept', () => {
  it('should return an Accept instance', () => {
    const ctx = context();
    ctx.req.headers.accept =
      'application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain';
    assert.ok(ctx.accept instanceof accepts);
  });
});

describe('ctx.accept=', () => {
  it('should replace the accept object', () => {
    const ctx = context();
    ctx.req.headers.accept = 'text/plain';
    assert.deepStrictEqual(ctx.accepts(), ['text/plain']);

    const request = createRequest();
    request.req.headers.accept =
      'application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain';
    ctx.accept = accepts(request.req);
    assert.deepStrictEqual(ctx.accepts(), [
      'text/html',
      'text/plain',
      'image/jpeg',
      'application/*',
    ]);
  });
});
