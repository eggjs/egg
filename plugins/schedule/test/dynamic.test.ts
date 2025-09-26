import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

describe('cluster', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('dynamic-cluster'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support dynamic disable', async () => {
    await sleep(5000);

    const log = getLogContent('dynamic-cluster');
    // console.log(log);
    expect(contains(log, 'interval')).toBe(0);
    expect(contains(log, 'cron')).toBe(1);
  });
});

// Error: [vitest-pool]: Unexpected call to process.send(). Make sure your test cases are not interfering with process's channel.
// Received value: {"action":"egg-schedule","data":{"key":"~/egg/plugins/schedule/test/fixtures/dynamic-app/app/schedule/sub/cron.js","id":"17588831550011801537483853751","args":[],"success":true,"workerId":20497,"rt":0},"to":"agent"}
describe.skip('app', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('dynamic-app') });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support run disabled dynamic schedule', async () => {
    await app.runSchedule('interval');
    await sleep(1000);
    const log = getLogContent('dynamic-app');
    // console.log(log);
    expect(contains(log, 'interval')).toBe(1);
  });
});
