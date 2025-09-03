import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { response } from '../test-helpers/context.ts';
import Koa from '../../src/index.ts';

describe('res.header', () => {
  it('should return the response header object', () => {
    const res = response();
    res.set('X-Foo', 'bar');
    res.set('X-Number', 200);
    assert.deepEqual(res.header, { 'x-foo': 'bar', 'x-number': '200' });
  });

  it('should use res.getHeaders() accessor when available', () => {
    const res = response();
    // @ts-expect-error for testing
    res.res._headers = null;
    res.res.getHeaders = () => ({ 'x-foo': 'baz' });
    assert.deepEqual(res.header, { 'x-foo': 'baz' });
  });

  it('should return the response header object when no mocks are in use', async () => {
    const app = new Koa();
    let header;

    app.use(ctx => {
      ctx.set('x-foo', '42');
      header = { ...ctx.response.header };
    });

    await request(app.callback()).get('/');

    assert.deepEqual(header, { 'x-foo': '42' });
  });

  describe('when res._headers not present', () => {
    it('should return empty object', () => {
      const res = response();
      // @ts-expect-error for testing
      res.res._headers = null;
      assert.deepEqual(res.header, {});
    });
  });
});
