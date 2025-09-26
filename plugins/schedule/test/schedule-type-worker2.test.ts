import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getLogContent } from './utils.ts';

describe('cluster - context', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('context'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('context');
    // console.log(log);
    expect(log).toMatch(/method: SCHEDULE/);
    expect(log).toMatch(/path: \/__schedule/);
    expect(log).toMatch(/(.*?)sub(\/|\\)cron\.js/);
    expect(log).toMatch(/"type":"worker"/);
    expect(log).toMatch(/"cron":"\*\/5 \* \* \* \* \*"/);
    expect(log).toMatch(/hello busi/);
  });
});

describe.skip('cluster - async', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('async'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('async');
    expect(log).toMatch(/method: SCHEDULE/);
    expect(log).toMatch(/path: \/__schedule/);
    expect(log).toMatch(/(.*?)sub(\/|\\)cron\.js/);
    expect(log).toMatch(/"type":"worker"/);
    expect(log).toMatch(/"cron":"\*\/5 \* \* \* \* \*"/);
    expect(log).toMatch(/hello busi/);
  });
});
