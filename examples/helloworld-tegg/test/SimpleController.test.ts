import { expect, test } from 'vitest';

import { app } from '@eggjs/mock/bootstrap';

test('should GET /api/headers with headers', async () => {
  await app.httpRequest().get('/api/headers').set('X-Custom', 'custom').expect(200).expect({
    message: `hello custom`,
  });
});

test('should GET /api/hello/:name', async () => {
  await app.httpRequest().get('/api/hello/world').expect(200).expect({
    message: `hello world`,
  });
});

test('should GET /api/foo', async () => {
  const res = await app.httpRequest().get('/api/foo').expect(200);
  console.log(res.body.data.version, res.body.data.description);
  expect(res.body.message).toBe('hello, bar: hello, world!');
  expect(res.body.data).toBeDefined();
  expect(res.body.data.name).toBe('egg');
  expect(res.body.data.version).toMatch(/^\d+\.\d+\.\d+/);
});
