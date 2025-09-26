import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getCoreLogContent, contains, getScheduleLogContent } from './utils.ts';

describe('test/env.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('env'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support env list', async () => {
    await sleep(5000);
    const log = getCoreLogContent('env');
    expect(log).toMatch(/ignore schedule .*local\.js/);

    const scheduleLog = getScheduleLogContent('env');
    expect(contains(scheduleLog, 'undefined.js execute succeed')).toBeGreaterThanOrEqual(1);
    expect(contains(scheduleLog, 'unittest.js execute succeed')).toBeGreaterThanOrEqual(1);
    expect(contains(scheduleLog, 'local.js execute succeed')).toBe(0);
  });
});
