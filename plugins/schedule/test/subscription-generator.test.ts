import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('cluster - subscription-generator', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('subscription-generator'),
      workers: 1,
    });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should throw error on generator function', async () => {
    await sleep(3000);

    app.expect('stderr', /"schedule" generator function is not support, should use async function instead/);
  });
});
