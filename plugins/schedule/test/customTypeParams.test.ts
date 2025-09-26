import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, contains, getLogContent } from './utils.ts';

describe('test/customTypeParams.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('customTypeParams'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support custom schedule type', async () => {
    await sleep(5000);
    const log = getLogContent('customTypeParams');
    // console.log(log);
    expect(contains(log, "cluster_log { foo: 'worker' }")).toBe(1);
    expect(contains(log, "cluster_all_log { foo: 'all' }")).toBe(2);
    expect(contains(log, "cluster_log_clz { foo: 'worker' }")).toBe(1);
    expect(contains(log, "cluster_all_log_clz { foo: 'all' }")).toBe(2);
  });
});
