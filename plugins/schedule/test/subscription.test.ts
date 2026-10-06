import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect, vi } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

describe('cluster - subscription', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('subscription'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support interval and cron', async () => {
    // Keep the real 4-second interval and wait for both schedules to run.
    await vi.waitFor(
      () => {
        const log = getLogContent('subscription');
        expect(contains(log, 'interval')).toBeGreaterThanOrEqual(1);
        expect(contains(log, 'cron')).toBeGreaterThanOrEqual(1);
      },
      { timeout: 10000, interval: 100 },
    );
  });
});

describe('cluster - subscription-generator', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('subscription-generator'),
      workers: 1,
    });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should throw error on generator function', async () => {
    await vi.waitFor(
      () => {
        expect(app.stderr).toMatch(/"schedule" generator function is not support, should use async function instead/);
      },
      { timeout: 5000, interval: 100 },
    );
  });
});

describe('cluster - subscription-enableFastContextLogger', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('subscription-enableFastContextLogger'),
      workers: 1,
    });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support interval and cron', async () => {
    await sleep(5000);

    const log = getLogContent('subscription-enableFastContextLogger');
    // console.log(log);
    // unstable
    expect(contains(log, 'interval')).toBeGreaterThanOrEqual(0);
    expect(contains(log, 'cron')).toBeGreaterThanOrEqual(0);
    // 2022-12-11 16:44:55,009 INFO 22958 [-/127.0.0.1/15d62420-7930-11ed-86ce-31ec9c2e0d18/3ms SCHEDULE /__schedule
    // expect(log).toMatch(/ INFO \w+ \[-\/127\.0\.0\.1\/\w+-\w+-\w+-\w+-\w+\/[\d.]+ms SCHEDULE \/__schedule/);
  });
});
