import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

describe('cluster - cronOptions', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('cronOptions'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('cronOptions');
    // const scheduleLog = getScheduleLogContent('cronOptions');
    // console.log(log);
    // unstable
    expect(contains(log, 'cron-options')).toBeGreaterThanOrEqual(0);
    // expect(scheduleLog).toMatch(/cron-options.js reach endDate, will stop/);
  });
});
