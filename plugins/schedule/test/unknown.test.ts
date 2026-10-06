import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/unknown.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('unknown') });
    await app.ready();
    app.mockLog('scheduleLogger');
  });
  afterAll(async () => {
    await app.close();
    await mm.restore();
  });

  it('should warn about an unknown task', async () => {
    // Await the registered async message handler, including its app.ready() wait.
    // No cluster boot, IPC timer or file flush is needed to test the unknown-task branch.
    for (const listener of app.messenger.listeners('egg-schedule')) {
      await listener({ key: 'no-exist' });
    }
    app.expectLog(/no-exist unknown task/, 'scheduleLogger');
  });
});
