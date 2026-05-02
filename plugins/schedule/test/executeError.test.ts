import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getScheduleLogContent } from './utils.ts';

// FIXME: flaky test on Window, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('test/executeError.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('executeError'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should schedule execute error', async () => {
    await expect
      .poll(() => contains(getScheduleLogContent('executeError'), 'interval.js execute failed'), {
        interval: 500,
        timeout: 10000,
      })
      .toBe(2);
  });
});
