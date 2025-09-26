import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getLogContent, contains, getScheduleLogContent } from './utils.ts';

describe('test/customDirectory.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('customDirectory'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('customDirectory');
    // console.log(log);
    expect(contains(log, ' interval')).toBe(1);
    expect(contains(log, ' customDirectory')).toBe(1);

    const scheduleLog = getScheduleLogContent('customDirectory');
    expect(contains(scheduleLog, 'custom.js execute succeed')).toBe(1);
    expect(contains(scheduleLog, 'interval.js execute succeed')).toBe(1);
  });
});
