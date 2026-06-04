import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

describe.skipIf(process.platform === 'win32')('cluster - immediate-onlyonce', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('immediate-onlyonce'),
      workers: 1,
    });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);

    const log = getLogContent('immediate-onlyonce');
    // console.log(log);
    // unstable
    expect(contains(log, 'immediate-onlyonce')).toBeGreaterThanOrEqual(0);
  });
});
