import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeEach, afterEach, it, describe } from 'vitest';

import { getFilepath } from './utils.ts';

describe('test/fast_ready_false.test.ts', () => {
  let app: MockApplication;
  beforeEach(() => {
    mm(process.env, 'NODE_ENV', 'development');
  });
  afterEach(() => app.close());
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should disable fast ready by default', async () => {
    app = mm.cluster({
      baseDir: getFilepath('delay-ready'),
    });
    app.debug();
    await app.ready();
    // We need to wait for log written, because app.logger.info is async.
    await scheduler.wait(1000);

    app.expect('stdout', /Server started./);
  });

  it('should set config.development.fastReady to true work', async () => {
    app = mm.cluster({
      baseDir: getFilepath('fast-ready'),
    });
    app.debug();
    await app.ready();
    // We need to wait for log written, because app.logger.info is async.
    await scheduler.wait(1000);

    app.expect('stdout', /delayed 200ms done./);
    app.expect('stdout', /Server started./);
  });
});
