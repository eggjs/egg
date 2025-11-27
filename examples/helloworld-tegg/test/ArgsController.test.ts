import { app } from '@eggjs/mock/bootstrap';
import { expect, test } from 'vitest';

test('should POST /api/args/request success', async () => {
  app.mockCsrf();
  const res = await app.httpRequest().post('/api/args/request').send({
    name: 'foo',
    desc: 'mock-desc 🥚🥚🥚',
  });
  expect(res.status).toBe(200);
  // console.log(res.body);
  expect(res.body).toEqual({
    headerData: null,
    arrayBufferDataString: '{"name":"foo","desc":"mock-desc 🥚🥚🥚"}',
  });
});

test('should POST /api/args/request2 error', async () => {
  app.mockCsrf();
  const res = await app.httpRequest().post('/api/args/request2').send({
    name: 'foo',
    desc: 'mock-desc 🥚🥚🥚',
  });
  expect(res.status).toBe(200);
  console.log(res.body);
  expect(res.body).toEqual({
    headerData: null,
    body: {
      name: 'foo',
      desc: 'mock-desc 🥚🥚🥚',
    },
    arrayBufferDataString: '{"name":"foo","desc":"mock-desc 🥚🥚🥚"}',
  });
});
