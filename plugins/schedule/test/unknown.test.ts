import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures, getScheduleLogContent } from './utils.ts';

describe('test/unknown.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('unknown'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should schedule unknown task', async () => {
    await sleep(3000);
    expect(getScheduleLogContent('unknown')).toMatch(/no-exist unknown task/);
  });
});
