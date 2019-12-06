'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const utils = require('../../../utils');

describe('test/lib/core/config/config.cookies.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/app-config-cookies');
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should auto set sameSite cookie', async () => {
    const res = await app.httpRequest()
      .get('/');
    assert(res.status === 200);
    assert(res.text === 'hello');
    const cookies = res.headers['set-cookie'];
    assert(cookies.length >= 1);
    for (const cookie of cookies) {
      assert(cookie.includes('; samesite=lax'));
    }
  });
});
