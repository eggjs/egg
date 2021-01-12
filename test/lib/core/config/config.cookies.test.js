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

describe('test/lib/core/config/config.cookies.test.js#multidomain', () => {
  let app;
  before(() => {
    app = utils.app('apps/app-config-cookies-multidomain');
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should set correct domain', async () => {
    const res = await app.httpRequest()
      .get('/')
      .set('host', 'a.a.com');
    assert(res.status === 200);
    assert(res.text === 'hello');
    const cookies = res.headers['set-cookie'];
    assert(cookies.length >= 1);
    for (const cookie of cookies) {
      if (cookie.startsWith('foo')) {
        assert(cookie.includes('; domain=.a.com'));
      }
    }
  });

  it('should not set domain on no domain matched', async () => {
    const res = await app.httpRequest()
      .get('/')
      .set('host', 'b.c.com');
    assert(res.status === 200);
    assert(res.text === 'hello');
    const cookies = res.headers['set-cookie'];
    assert(cookies.length >= 1);
    for (const cookie of cookies) {
      assert(!cookie.includes('; domain='));
    }
  });
});
