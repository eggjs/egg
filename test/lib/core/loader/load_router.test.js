'use strict';

const request = require('supertest-as-promised');
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
    request(app.callback())
    .get('/')
    .expect(200)
    .expect('hello', done);

    request(app.callback())
    .get('/home')
    .expect(200)
    .expect('hello', done);
  });
});
