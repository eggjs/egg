'use strict';

const pedding = require('pedding');
const utils = require('../../../utils');

describe('test/lib/core/loader/load_router.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/app-router');
    return app.ready();
  });
  after(() => app.close());

  it('should load app/router.js', done => {
    done = pedding(2, done);
    app.httpRequest()
      .get('/')
      .expect(200)
      .expect('hello', done);

    app.httpRequest()
      .get('/home')
      .expect(200)
      .expect('hello', done);
  });
});
