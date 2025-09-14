import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/fast_ready_false.test.ts', () => {
  let app: MockApplication;
  beforeEach(() => {
    mm(process.env, 'NODE_ENV', 'development');
  });
  afterEach(() => app.close());
  afterEach(mm.restore);
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should disable fast ready by default', async () => {
    app = mm.cluster({
      baseDir: 'delay-ready',
    });
    await app.ready();
    // We need to wait for log written, because app.logger.info is async.
    await scheduler.wait(100);

    app.expect('stdout', /Server started./);
  });

  it('should set config.development.fastReady to true work', async () => {
    app = mm.cluster({
      baseDir: 'fast-ready',
    });
    await app.ready();
    // We need to wait for log written, because app.logger.info is async.
    await scheduler.wait(300);

    app.expect('stdout', /delayed 200ms done./);
    app.expect('stdout', /Server started./);
  });
});
