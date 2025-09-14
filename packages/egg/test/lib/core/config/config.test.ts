import { test, beforeAll, afterAll, expect } from 'vitest';

import { type MockApplication, createApp } from '../../../utils.ts';

let app: MockApplication;
beforeAll(() => {
  app = createApp('apps/demo');
  return app.ready();
});
afterAll(() => app.close());

test('should return config.name', () => {
  expect(app.config.name).toBe('demo');
  expect(app.config.logger.disableConsoleAfterReady).toBe(false);
});
