import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

// TODO: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('cluster - immediate', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('immediate'), workers: 1 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);

    const log = getLogContent('immediate');
    // console.log(log);
    expect(contains(log, 'immediate-interval')).toBeGreaterThanOrEqual(2);
    expect(contains(log, 'immediate-cron')).toBeGreaterThanOrEqual(2);
  });
});
