import { test, expect } from 'vitest';
import { app } from '@eggjs/mock/bootstrap';

test('should GET / status 200', async () => {
  const res = await app.httpRequest().get('/');
  expect(res.status).toBe(200);
  expect(res.text).toBe('hello egg');
});
