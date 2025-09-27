import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getLogContent, contains } from './utils.ts';

describe('test/schedule-plugin.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('plugin'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support interval and cron', async () => {
    await sleep(5000);
    const log = getLogContent('plugin');
    // console.log(log);
    expect(contains(log, 'interval')).toBeGreaterThanOrEqual(1);
    expect(contains(log, 'cron')).toBeGreaterThanOrEqual(1);
  });
});
