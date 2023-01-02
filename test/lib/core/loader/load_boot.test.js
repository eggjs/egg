const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');
const utils = require('../../../utils');

describe('test/lib/core/loader/load_boot.test.js', () => {
  let app;

  before(() => {
    app = utils.app('apps/boot-app');
    return app.ready();
  });

  it('should load app.js', async () => {
    await app.close();
    app.expectLog('app is ready');

    // should restore
    const logContent = await fs.readFile(path.join(app.config.logger.dir, 'egg-agent.log'), 'utf-8');
    assert(!logContent.includes('agent can\'t call sendToApp before server started'));
    assert(app.messengerLog);

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
