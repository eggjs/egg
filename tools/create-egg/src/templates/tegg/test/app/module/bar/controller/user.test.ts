import { app } from '@eggjs/mock/bootstrap';
import { test, expect } from 'vitest';

test('should GET /bar/user status 200', async () => {
  const res = await app.httpRequest().get('/bar/user').query({ userId: '20170901' });
  expect(res.status).toBe(200);
  expect(res.text).toBe('hello, 20170901');
});
