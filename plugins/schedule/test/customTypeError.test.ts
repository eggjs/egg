import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from '@voidzero-dev/vite-plus/test';

import { getFixtures, getLogContent, contains } from './utils.ts';

// FIXME: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('test/customTypeError.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('customTypeError'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(process.env.CI ? 10000 : 5000);
    const log = getLogContent('customTypeError');
    // console.log(log);
    expect(contains(log, 'cluster_log')).toBeGreaterThanOrEqual(1);
  });
});
