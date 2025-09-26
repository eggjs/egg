import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getLogContent, contains } from './utils.ts';

describe('test/customType.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('customType'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
    await sleep(5000);
    const log = getLogContent('customType');
    // console.log(log);
    expect(contains(log, 'cluster_log')).toBe(1);
  });
});
