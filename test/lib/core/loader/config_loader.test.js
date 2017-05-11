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

  it('should get middlewares', function* () {
    app = utils.app('apps/demo');
    yield app.ready();
    assert.deepEqual(app.config.coreMiddleware.slice(0, 6), [
      'meta',
      'siteFile',
      'notfound',
      'static',
      'bodyParser',
      'session',
    ]);
  });

  it('should get logger dir when unittest', function* () {
    mm(process.env, 'EGG_HOME', home);
    mm(process.env, 'EGG_SERVER_ENV', 'unittest');
    app = utils.app('apps/demo');
    yield app.ready();
    assert.deepEqual(app.config.logger.dir, utils.getFilepath('apps/demo/logs/demo'));
  });

  it('should get logger dir when default', function* () {
    mm(process.env, 'EGG_HOME', home);
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    app = utils.app('apps/demo');
    yield app.ready();
    assert.deepEqual(app.config.logger.dir, path.join(home, 'logs/demo'));
  });
});
