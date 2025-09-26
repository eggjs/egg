import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/scheduleError.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('scheduleError'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should thrown', async () => {
    await sleep(5000);
    app.expect('stderr', /`schedule\.interval` or `schedule\.cron` or `schedule\.immediate` must be present/);
  });
});
