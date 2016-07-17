'use strict';

const request = require('supertest');
const mm = require('egg-mock');
const utils = require('../../utils');

describe.skip('test/lib/plugins/rest.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/rest');
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should GET /api/{objects} => app/apis/{objects}.js:index()', () => {
    return request(app.callback())
      .get('/api/users')
      .expect({
        data: [
          {
            id: 1,
            name: 'suqian.yf',
            age: 18,
          },
          {
            id: 2,
            name: 'name2',
            age: 30,
          },
        ],
      })
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200);
  });

  it('should GET /api/categories', () => {
    return request(app.callback())
      .get('/api/categories')
      .expect({
        data: [
          { name: 'c1' },
          { name: 'c2' },
        ],
      });
  });
});
