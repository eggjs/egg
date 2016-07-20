'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe('test/lib/plugins/userrole.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/userrole');
    return app.ready();
  });
  after(() => app.close());

  it('should GET /user 200 when user login', () => {
    return request(app.callback())
      .get('/user?name=user2')
      .expect('hello user2')
      .expect(200);
  });

  it('should GET /admin 200 when admin login', () => {
    return request(app.callback())
      .get('/admin?name=fengmk2')
      .expect('hello admin')
      .expect(200);
  });
});
