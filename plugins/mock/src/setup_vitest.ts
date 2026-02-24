import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { mock, type MockApplication } from './index.ts';

// Provide Mocha-compatible aliases so existing tests using before/after still work
// Vitest globals only inject beforeAll/afterAll, not Mocha's before/after
const g = globalThis as Record<string, unknown>;
if (!g.before) g.before = beforeAll;
if (!g.after) g.after = afterAll;
if (!g.beforeEach) g.beforeEach = beforeEach;
if (!g.afterEach) g.afterEach = afterEach;

let app: MockApplication | undefined;

beforeAll(async () => {
  const { app: bootstrapApp } = await import('./bootstrap.ts');
  app = bootstrapApp;
  await app.ready();
});

afterEach(async () => {
  if (app && typeof app.backgroundTasksFinished === 'function') {
    await app.backgroundTasksFinished();
  }
  await mock.restore();
});

afterAll(async () => {
  if (app) await app.close();
});
