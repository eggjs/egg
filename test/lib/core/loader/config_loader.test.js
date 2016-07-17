'use strict';

const utils = require('../../../utils');
const AppWorkerLoader = require('../../../../').AppWorkerLoader;

function createLoader(baseDir) {
  baseDir = utils.getFilepath(baseDir);
  const loader = new AppWorkerLoader({
    baseDir,
  });
  loader.loadConfig();
  return loader;
}

describe('test/lib/core/loader/config_loader.test.js', () => {
  it('should get middlewares', () => {
    const appLoader = createLoader('apps/demo');
    appLoader.config.coreMiddleware.should.eql([
      'meta',
      'siteFile',
      'notfound',
      'bodyParser',
      'overrideMethod',
    ]);
  });
});
