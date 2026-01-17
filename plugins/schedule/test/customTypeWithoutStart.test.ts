import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vite-plus/test';

import { getFixtures, getLogContent, contains } from './utils.ts';

// TODO: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('test/customTypeWithoutStart.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('customTypeWithoutStart'),
      workers: 2,
    });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('customTypeWithoutStart');
    // console.log(log);
    expect(contains(log, 'cluster_log')).toBeGreaterThanOrEqual(1);
  });
});
