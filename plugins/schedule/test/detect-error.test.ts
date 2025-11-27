import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getScheduleLogContent, contains } from './utils.ts';

describe('test/detect-error.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('detect-error'),
      workers: 1,
      cache: false,
    });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should error', async () => {
    await sleep(5000);
    const scheduleLog = getScheduleLogContent('detect-error');
    expect(contains(scheduleLog, 'suc.js execute succeed'), scheduleLog).toBe(1);
    expect(contains(scheduleLog, /fail\.js execute failed, used [\d.]+ms. fail/), scheduleLog).toBe(1);
    expect(contains(scheduleLog, /error\.js execute failed, used [\d.]+ms. Error: some err/), scheduleLog).toBe(1);
  });
});
