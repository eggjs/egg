import { strict as assert } from 'node:assert';
import querystring from 'node:querystring';
import { createApp, MockApplication } from '../../utils.js';

describe('test/app/middleware/body_parser.test.ts', () => {
  let app: MockApplication;
  let app1: MockApplication;
  let csrf: string;
  let cookies: string;
  before(async () => {
    app = createApp('apps/body_parser_testapp');
    await app.ready();
    const res = await app.httpRequest()
      .get('/test/body_parser/user')
      .expect(200);
    csrf = res.body.csrf || '';
    cookies = (res.headers['set-cookie'] as any).join(';');
    assert(csrf);
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

  it('should 200 when post json with content-type: application/json;charset=utf-8', () => {
    app.mockCsrf();
    return app.httpRequest()
      .post('/test/body_parser/user')
      .set('Cookie', cookies)
      .set('Content-Type', 'application/json;charset=utf-8')
      .send({ test: 1 })
      .expect({ test: 1 })
      .expect(200);
  });

  // fix https://github.com/eggjs/egg/issues/5214
  it('should 200 when post json with `content-type: application/json;charset=utf-8;`', () => {
    app.mockCsrf();
    return app.httpRequest()
      .post('/test/body_parser/user')
      .set('Cookie', cookies)
      .set('Content-Type', 'application/json;charset=utf-8;')
      .send({ test: 1 })
      .expect({ test: 1 })
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

  it('should 400 when GET with invalid body', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/test/body_parser/user')
      .set('content-type', 'application/json')
      .set('content-encoding', 'gzip')
      .expect(/unexpected end of file, check bodyParser config/)
      .expect(400);

    await app.httpRequest()
      .get('/test/body_parser/user')
      .set('content-type', 'application/json')
      .set('content-encoding', 'gzip')
      .send({ foo: 'a'.repeat(1024) })
      .expect(/incorrect header check, check bodyParser config/)
      .expect(400);
  });

  it('should 400 when POST with Prototype-Poisoning body', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .post('/test/body_parser/user')
      .set('content-type', 'application/json')
      .set('content-encoding', 'gzip')
      .expect(/unexpected end of file, check bodyParser config/)
      .expect(400);
  });

  it('should disable body parser', async () => {
    app1 = createApp('apps/body_parser_testapp_disable');
    await app1.ready();

    await app1.httpRequest()
      .post('/test/body_parser/foo.json')
      .send({ foo: 'bar', ']': 'toString' })
      .expect(204);
  });

  it('should body parser support ignore', async () => {
    app1 = createApp('apps/body_parser_testapp_ignore');
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
    app1 = createApp('apps/body_parser_testapp_match');
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
