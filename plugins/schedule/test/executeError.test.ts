import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getScheduleLogContent } from './utils.ts';

describe('test/executeError.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('executeError'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should schedule execute error', async () => {
    await sleep(5000);
    const scheduleLog = getScheduleLogContent('executeError');
    expect(contains(scheduleLog, 'interval.js execute failed')).toBe(2);
  });
});
