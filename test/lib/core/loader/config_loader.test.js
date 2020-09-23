'use strict';

const assert = require('assert');
const path = require('path');
const mm = require('egg-mock');
const utils = require('../../../utils');

describe('test/lib/core/loader/config_loader.test.js', () => {
  let app;
  const home = utils.getFilepath('apps/demo/logs/home');
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('should get middlewares', async () => {
    app = utils.app('apps/demo');
    await app.ready();
    assert.deepStrictEqual(app.config.coreMiddleware.slice(0, 7), [
      'meta',
      'siteFile',
      'notfound',
      'static',
      'bodyParser',
      'overrideMethod',
      'session',
    ]);
  });

  it('should get logger dir when unittest', async () => {
    mm(process.env, 'EGG_HOME', home);
    mm(process.env, 'EGG_SERVER_ENV', 'unittest');
    app = utils.app('apps/demo');
    await app.ready();
    assert.deepEqual(app.config.logger.dir, utils.getFilepath('apps/demo/logs/demo'));
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should get logger dir when default', async () => {
    mm(process.env, 'EGG_HOME', home);
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    app = utils.app('apps/demo');
    await app.ready();
    assert.deepEqual(app.config.logger.dir, path.join(home, 'logs/demo'));
    assert(app.config.logger.disableConsoleAfterReady === true);
  });

  it('should get cluster defaults', async () => {
    app = utils.app('apps/demo');
    await app.ready();
    assert(app.config.cluster.listen.path === '');
    assert(app.config.cluster.listen.port === 7001);
    assert(app.config.cluster.listen.hostname === '');
  });
});
