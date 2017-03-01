'use strict';

const querystring = require('querystring');
const should = require('should');
const request = require('supertest');
const utils = require('../../utils');

describe('test/app/middleware/body_parser.test.js', () => {
  let app;
  let app1;
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
  afterEach(() => app1 && app1.close());

  it('should 200 when post form body below the limit', done => {
    request(app.callback())
    .post('/test/body_parser/user')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('Accept', 'application/json')
    // https://snyk.io/vuln/npm:qs:20170213 test case
    .send(querystring.stringify({ foo: 'bar', _csrf: csrf, ']': 'toString' }))
    .expect({ foo: 'bar', _csrf: csrf, ']': 'toString' })
    .expect(200, done);
  });

  it('should 200 when post json body below the limit', done => {
    request(app.callback())
    .post('/test/body_parser/user')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send({ foo: 'bar', _csrf: csrf, ']': 'toString' })
    .expect({ foo: 'bar', _csrf: csrf, ']': 'toString' })
    .expect(200, done);
  });

  it('should disable body parser', function* () {
    app1 = utils.app('apps/body_parser_testapp_disable');
    yield app1.ready();

    yield request(app1.callback())
    .post('/test/body_parser/foo.json')
    .send({ foo: 'bar', ']': 'toString' })
    .expect(204);
  });

  it('should body parser support ignore', function* () {
    app1 = utils.app('apps/body_parser_testapp_ignore');
    yield app1.ready();

    yield request(app1.callback())
    .post('/test/body_parser/foo.json')
    .send({ foo: 'bar', ']': 'toString' })
    .expect(204);

    yield request(app1.callback())
    .post('/test/body_parser/form.json')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .send({ foo: 'bar', ']': 'toString' })
    .expect({ foo: 'bar', ']': 'toString' });
  });

  it('should body parser support match', function* () {
    app1 = utils.app('apps/body_parser_testapp_match');
    yield app1.ready();

    yield request(app1.callback())
    .post('/test/body_parser/foo.json')
    .send({ foo: 'bar', ']': 'toString' })
    .expect({ foo: 'bar', ']': 'toString' });

    yield request(app1.callback())
    .post('/test/body_parser/form.json')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .send({ foo: 'bar', ']': 'toString' })
    .expect(204);
  });
});
