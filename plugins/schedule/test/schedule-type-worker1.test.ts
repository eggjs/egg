import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent, getScheduleLogContent } from './utils.ts';

describe('cluster - worker', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('worker'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('worker');
    // console.log(log);
    expect(contains(log, 'interval')).toBe(1);
    expect(contains(log, 'cron')).toBe(1);

    const scheduleLog = getScheduleLogContent('worker');
    // console.log(scheduleLog);
    expect(contains(scheduleLog, 'cron.js executing by app')).toBe(1);
    expect(contains(scheduleLog, 'cron.js execute succeed')).toBe(1);
    expect(contains(scheduleLog, 'interval.js executing by app')).toBe(1);
    expect(contains(scheduleLog, 'interval.js execute succeed')).toBe(1);
  });
});
