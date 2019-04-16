'use strict';

const assert = require('assert');
const utils = require('../../../utils');

describe('test/lib/core/loader/load_boot.test.js', () => {
  let app;

  before(() => {
    app = utils.app('apps/boot-app');
    return app.ready();
  });

  it('should load app.js', async () => {
    app.mockLog();
    await app.close();
    app.expectLog('app is ready');
    assert.deepStrictEqual(app.bootLog, [ 'configDidLoad',
      'didLoad',
      'willReady',
      'didReady',
      'serverDidReady',
      'beforeClose' ]);
    assert.deepStrictEqual(app.agent.bootLog, [ 'configDidLoad',
      'didLoad',
      'willReady',
      'didReady',
      'serverDidReady',
      'beforeClose' ]);
  });

});
