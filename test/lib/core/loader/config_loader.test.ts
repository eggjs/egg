import { strict as assert } from 'node:assert';
import path from 'node:path';
import { mm } from '@eggjs/mock';
import { MockApplication, createApp, getFilepath } from '../../../utils.js';

describe('test/lib/core/loader/config_loader.test.ts', () => {
  let app: MockApplication;
  const home = getFilepath('apps/demo/logs/home');
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('should get middlewares', async () => {
    app = createApp('apps/demo');
    await app.ready();
    assert.deepStrictEqual(app.config.coreMiddleware, [
      'meta',
      'siteFile',
      'notfound',
      'static',
      'bodyParser',
      'overrideMethod',
      'clusterAppMock',
      'session',
      'securities',
    ]);
  });

  it('should get logger dir when unittest', async () => {
    mm(process.env, 'EGG_HOME', home);
    mm(process.env, 'EGG_SERVER_ENV', 'unittest');
    app = createApp('apps/demo');
    await app.ready();
    assert.deepEqual(app.config.logger.dir, getFilepath('apps/demo/logs/demo'));
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should get logger dir when default', async () => {
    mm(process.env, 'EGG_HOME', home);
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    app = createApp('apps/demo');
    await app.ready();
    assert.deepEqual(app.config.logger.dir, path.join(home, 'logs/demo'));
    assert(app.config.logger.disableConsoleAfterReady === true);
  });

  it('should get cluster defaults', async () => {
    app = createApp('apps/demo');
    await app.ready();
    assert(app.config.cluster.listen.path === '');
    assert(app.config.cluster.listen.port === 7001);
    assert(app.config.cluster.listen.hostname === '');
  });
});
