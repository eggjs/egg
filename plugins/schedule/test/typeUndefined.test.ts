import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

// TODO: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('test/typeUndefined.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('typeUndefined'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should thrown', async () => {
    await sleep(5000);
    app.expect('stderr', /schedule type \[undefined\] is not defined/);
  });
});
