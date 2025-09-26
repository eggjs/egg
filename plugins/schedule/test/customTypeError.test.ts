import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getLogContent, contains } from './utils.ts';

describe('test/customTypeError.test.ts', () => {
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
    expect(contains(log, 'cluster_log')).toBe(1);
  });
});
