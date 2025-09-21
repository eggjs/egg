import { test, expect } from 'vitest';

import { app } from '@eggjs/mock/bootstrap';

test('should GET / status 200', async () => {
  const res = await app.httpRequest().get('/').expect(200);
  expect(res.text).toBe('hi, egg');
});
