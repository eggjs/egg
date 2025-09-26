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

describe('cluster - worker-ctxStorage', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('worker-ctxStorage'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('worker-ctxStorage');
    // console.log(log);
    expect(contains(log, 'interval')).toBe(1);
    expect(contains(log, 'foobar')).toBe(1);

    const scheduleLog = getScheduleLogContent('worker-ctxStorage');
    // console.log(scheduleLog);
    expect(contains(scheduleLog, 'foobar.js executing by app')).toBe(1);
    expect(contains(scheduleLog, 'foobar.js execute succeed')).toBe(1);
    expect(contains(scheduleLog, 'interval.js executing by app')).toBe(1);
    expect(contains(scheduleLog, 'interval.js execute succeed')).toBe(1);
  });
});

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
    const scheduleLog = getScheduleLogContent('cronOptions');
    // console.log(log);
    expect(contains(log, 'cron-options')).toBeGreaterThanOrEqual(1);
    expect(scheduleLog).toMatch(/cron-options.js reach endDate, will stop/);
  });
});
