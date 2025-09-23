import { strict as assert } from 'node:assert';

import { test, beforeAll, afterAll } from 'vitest';

import { createApp, startLocalServer, type MockApplication } from '../../utils.ts';

let url: string;
let app: MockApplication;

beforeAll(async () => {
  app = createApp('apps/context_httpclient');
  await app.ready();
  url = await startLocalServer();
});

afterAll(() => app.close());

test('should send request with ctx.httpclient', async () => {
  const ctx = app.mockContext();
  const httpclient = ctx.httpclient;
  assert.equal(ctx.httpclient, httpclient);
  assert.equal((httpclient as any).ctx, ctx);
  assert.equal(typeof httpclient.request, 'function');
  assert.equal(typeof httpclient.curl, 'function');
  const result = await ctx.httpclient.request(url);
  assert.equal(result.status, 200);
  const result2 = await ctx.httpclient.curl(url);
  assert.equal(result2.status, 200);
});
