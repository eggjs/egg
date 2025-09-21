import { test, expect } from 'vitest';

import { app } from '@eggjs/mock/bootstrap';

test('sayHi should return hi, egg', async () => {
  const ctx = app.mockContext();
  const result = await ctx.service.test.sayHi('egg');
  expect(result).toBe('hi, egg');
});
