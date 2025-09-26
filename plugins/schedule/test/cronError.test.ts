import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/cronError.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('cronError'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should schedule cron instruction invalid', async () => {
    await sleep(1000);
    app.expect('stderr', /parse cron instruction\(invalid instruction\) error/);
  });
});
