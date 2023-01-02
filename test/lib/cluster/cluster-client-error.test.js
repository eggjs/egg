const { readFile } = require('fs/promises');
const path = require('path');
const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/cluster/cluster-client-error.test.js', () => {
  let app;
  before(async () => {
    app = utils.app('apps/cluster-client-error');

    let err;
    try {
      await app.ready();
    } catch (e) {
      err = e;
    }
    assert(err);
  });

  it('should close even if app throw error', () => {
    return app.close();
  });

  it('should follower not throw error', async () => {
    await utils.sleep(1000);
    const cnt = await readFile(path.join(__dirname, '../../fixtures/apps/cluster-client-error/logs/cluster-client-error/common-error.log'), 'utf8');
    assert(!cnt.includes('ECONNRESET'));
  });
});
