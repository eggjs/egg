'use strict';

const path = require('path');
const request = require('supertest-as-promised');
const mm = require('egg-mock');

describe('example cookie test', () => {
  let app;

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

  it('should GET / show "remember me" checkbox when cookie.remember not exists', () => {
    return request(app.callback())
      .get('/')
      .expect(200)
      .expect(/<input type="checkbox" name="remember"\/> remember me<\/label>/);
  });

  it('should POST /remember to set cookie.remember = 1', () => {
    return request(app.callback())
      .post('/remember')
      .send({
        remember: 'true',
      })
      .expect(302)
      .expect('Location', '/')
      .expect('Set-Cookie', /^remember=1; path=\/; expires=[^;]+; httponly,remember\.sig=[^;]+; path=\/; expires=[^;]+; httponly$/);
  });

  it('should GET /forget to delete cookie.remember', () => {
    return request(app.callback())
      .get('/forget')
      .expect(302)
      .expect('Location', '/')
      .expect('Set-Cookie', /^remember=; path=\/; expires=[^;]+; httponly$/);
  });
});
