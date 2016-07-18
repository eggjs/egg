'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe('test/lib/plugins/static.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/static-server');
    return app.ready();
  });

  it('should get exists js file', () => {
    return request(app.callback())
      .get('/public/foo.js')
      .expect('alert(\'bar\');\n')
      .expect(200);
  });
});
