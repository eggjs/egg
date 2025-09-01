import { test, beforeAll, afterAll, expect } from 'vitest';

import { MockApplication, createApp } from '../../../utils.ts';

let app: MockApplication;
beforeAll(() => {
  app = createApp('apps/app-config-cookies');
  return app.ready();
});
afterAll(() => app.close());

test('should auto set sameSite cookie', async () => {
  const res = await app.httpRequest()
    .get('/');
  expect(res.status).toBe(200);
  expect(res.text).toBe('hello');
  const cookies = res.headers['set-cookie'];
  expect(cookies.length >= 1);
  for (const cookie of cookies) {
    expect(cookie).toMatch('; samesite=lax');
  }
});