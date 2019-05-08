'use strict';
const assert = require('assert');
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
      .expect(res => assert.equal(String(res.text).replace(/\r/g, ''), 'alert(\'bar\');\n'))
      .expect(200);
  });
});
