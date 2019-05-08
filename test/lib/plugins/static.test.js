'use strict';
const utils = require('../../utils');

describe('test/lib/plugins/static.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/static-server');
    return app.ready();
  });

  it('should get exists js file', () => {
    return app.httpRequest()
      .get('/public/foo.js')
      .expect(/alert\(\'bar\'\);\r?\n/)
      .expect(200);
  });
});
