'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sleep = require('ko-sleep');
const utils = require('../../utils');

describe('test/lib/cluster/cluster-client-error.test.js', () => {
  let app;
  before(function* () {
    app = utils.app('apps/cluster-client-error');

    let err;
    try {
      yield app.ready();
    } catch (e) {
      err = e;
    }
    assert(err);
  });

  it('should close even if app throw error', () => {
    return app.close();
  });

  it('should follower not throw error', function* () {
    yield sleep(1000);
    const cnt = fs.readFileSync(path.join(__dirname, '../../fixtures/apps/cluster-client-error/logs/cluster-client-error/common-error.log'), 'utf8');
    assert(!cnt.includes('ECONNRESET'));
  });

});
