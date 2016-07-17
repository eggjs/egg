'use strict';

const path = require('path');
const request = require('supertest-as-promised');
const mm = require('egg-mock');

describe('example cookie_session test', () => {
  let app;
  let cookie;

  before(() => {
    const baseDir = path.dirname(__dirname);
    const customEgg = path.join(baseDir, '../..');
    app = mm.app({
      baseDir,
      customEgg,
    });
    return app.ready();
  });

  after(() => app.close());

  it('should GET / first time', () => {
    return request(app.callback())
      .get('/')
      .expect(200)
      .expect(/^1 times/)
      .expect('Set-Cookie', /^EGG_SESS=[^;]+; path=\/; expires=[^;]+; httponly$/)
      .expect(res => {
        cookie = res.headers['set-cookie'][0].split(';')[0];
      });
  });

  it('should GET / second time', () => {
    return request(app.callback())
      .get('/')
      .set('Cookie', cookie)
      .expect(200)
      .expect(/^2 times/)
      // session.count change
      .expect('Set-Cookie', /^EGG_SESS=[^;]+; path=\/; expires=[^;]+; httponly$/);
  });
});
