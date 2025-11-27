import { app } from '@eggjs/mock/bootstrap';
import { test, expect } from 'vitest';

test('sayHi should return hi, egg', async () => {
  const ctx = app.mockContext();
  const result = await ctx.service.test.sayHi('egg');
  expect(result).toBe('hi, egg, TypeScript');
});
