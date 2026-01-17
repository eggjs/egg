import { app } from '@eggjs/mock/bootstrap';
import { test, expect } from 'vite-plus/test';

test('should GET / status 200', async () => {
  const res = await app.httpRequest().get('/').expect(200);
  expect(res.text).toBe('hi, egg, TypeScript');
});
