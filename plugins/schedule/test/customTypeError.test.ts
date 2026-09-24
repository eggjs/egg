import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect, vi } from 'vitest';

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
    await vi.waitFor(
      () => {
        expect(contains(getLogContent('customTypeError'), 'cluster_log')).toBeGreaterThanOrEqual(1);
      },
      { timeout: 10000, interval: 100 },
    );
  });
});
