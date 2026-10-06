import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect, vi } from 'vitest';

import { getFixtures } from './utils.ts';

// TODO: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('test/scheduleError.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('scheduleError'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should thrown', async () => {
    await vi.waitFor(
      () => {
        expect(app.stderr).toMatch(/`schedule\.interval` or `schedule\.cron` or `schedule\.immediate` must be present/);
      },
      { timeout: 5000, interval: 100 },
    );
  });
});
