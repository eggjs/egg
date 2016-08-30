'use strict';

const querystring = require('querystring');
const should = require('should');
const request = require('supertest');
const utils = require('../../utils');

describe('test/app/middleware/body_parser.test.js', () => {
  let app;
  let csrf;
  let cookies;
  before(done => {
    app = utils.app('apps/body_parser_testapp');
    app.ready(() => {
      request(app.callback())
      .get('/test/body_parser/user')
      .expect(200, (err, res) => {
        should.not.exist(err);
        csrf = res.body.csrf || '';
        cookies = res.headers['set-cookie'].join(';');
        should.exist(csrf);
        done();
      });
    });
  });

  after(() => app.close());

  it('should 200 when post form body below the limit', done => {
    request(app.callback())
    .post('/test/body_parser/user')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('Accept', 'application/json')
    .send(querystring.stringify({ foo: 'bar', _csrf: csrf }))
    .expect({ foo: 'bar', _csrf: csrf })
    .expect(200, done);
  });

  it('should 200 when post json body below the limit', done => {
    request(app.callback())
    .post('/test/body_parser/user')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send({ foo: 'bar', _csrf: csrf })
    .expect({ foo: 'bar', _csrf: csrf })
    .expect(200, done);
  });
});
