import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent, getScheduleLogContent } from './utils.ts';

describe('cluster - all', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('all'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support interval and cron', async () => {
    await sleep(5000);

    const log = getLogContent('all');
    // console.log(log);
    expect(contains(log, 'interval')).toBe(2);
    expect(contains(log, 'cron')).toBe(2);

    const scheduleLog = getScheduleLogContent('all');
    expect(contains(scheduleLog, 'cron.js execute succeed')).toBe(2);
    expect(contains(scheduleLog, 'interval.js execute succeed')).toBe(2);
  });
});
