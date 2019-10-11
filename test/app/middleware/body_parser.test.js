'use strict';

const assert = require('assert');
const querystring = require('querystring');
const utils = require('../../utils');

describe('test/app/middleware/body_parser.test.js', () => {
  let app;
  let app1;
  let csrf;
  let cookies;
  before(done => {
    app = utils.app('apps/body_parser_testapp');
    app.ready(() => {
      app.httpRequest()
        .get('/test/body_parser/user')
        .expect(200, (err, res) => {
          assert(!err);
          csrf = res.body.csrf || '';
          cookies = res.headers['set-cookie'].join(';');
          assert(csrf);
          done();
        });
    });
  });

  after(() => app.close());
  afterEach(() => app1 && app1.close());

  it('should 200 when post form body below the limit', () => {
    return app.httpRequest()
      .post('/test/body_parser/user')
      .set('Cookie', cookies)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
    // https://snyk.io/vuln/npm:qs:20170213 test case
      .send(querystring.stringify({ foo: 'bar', _csrf: csrf, ']': 'toString' }))
      .expect({ foo: 'bar', _csrf: csrf, ']': 'toString' })
      .expect(200);
  });

  it('should 200 when post json body below the limit', () => {
    return app.httpRequest()
      .post('/test/body_parser/user')
      .set('Cookie', cookies)
      .set('Content-Type', 'application/json')
      .send({ foo: 'bar', _csrf: csrf, ']': 'toString' })
      .expect({ foo: 'bar', _csrf: csrf, ']': 'toString' })
      .expect(200);
  });

  it('should 413 when post json body over the limit', () => {
    app.mockCsrf();
    return app.httpRequest()
      .post('/test/body_parser/user')
      .set('Connection', 'keep-alive')
      .send({ foo: 'a'.repeat(1024 * 200) })
      .expect(/request entity too large, check bodyParser config/)
      .expect(413);
  });

  it('should disable body parser', async () => {
    app1 = utils.app('apps/body_parser_testapp_disable');
    await app1.ready();

    await app1.httpRequest()
      .post('/test/body_parser/foo.json')
      .send({ foo: 'bar', ']': 'toString' })
      .expect(204);
  });

  it('should body parser support ignore', async () => {
    app1 = utils.app('apps/body_parser_testapp_ignore');
    await app1.ready();

    await app1.httpRequest()
      .post('/test/body_parser/foo.json')
      .send({ foo: 'bar', ']': 'toString' })
      .expect(204);

    await app1.httpRequest()
      .post('/test/body_parser/form.json')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({ foo: 'bar', ']': 'toString' })
      .expect({ foo: 'bar', ']': 'toString' });
  });

  it('should body parser support match', async () => {
    app1 = utils.app('apps/body_parser_testapp_match');
    await app1.ready();

    await app1.httpRequest()
      .post('/test/body_parser/foo.json')
      .send({ foo: 'bar', ']': 'toString' })
      .expect({ foo: 'bar', ']': 'toString' });

    await app1.httpRequest()
      .post('/test/body_parser/form.json')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({ foo: 'bar', ']': 'toString' })
      .expect(204);
  });
});
