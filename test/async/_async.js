'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const utils = require('../utils');

describe('test/async.test.js', () => {
  afterEach(mm.restore);
  let app;
  before(async () => {
    app = utils.app('apps/async-app');
    await app.ready();
    assert(app.beforeStartExectuted);
    assert(app.scheduleExecuted);
  });
  after(async () => {
    await app.close();
    assert(app.beforeCloseExecuted);
  });

  it('middleware, controller and service support async functions', async () => {
    await app.httpRequest()
      .get('/api')
      .expect(200)
      .expect([ 'service', 'controller', 'router', 'middleware' ]);
  });
});
