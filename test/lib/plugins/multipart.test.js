'use strict';

const request = require('supertest');
const assert = require('assert');
const formstream = require('formstream');
const urllib = require('urllib');
const utils = require('../../utils');

describe('test/lib/plugins/multipart.test.js', () => {
  let app;
  let csrfToken;
  let cookies;
  let host;
  let server;
  before(() => {
    app = utils.app('apps/multipart');
    return app.ready();
  });
  before(done => {
    server = app.listen();
    request(server)
    .get('/')
    .expect(200, (err, res) => {
      csrfToken = res.headers['x-csrf'];
      cookies = res.headers['set-cookie'].join(';');
      host = `http://127.0.0.1:${server.address().port}`;
      done(err);
    });
  });

  after(() => {
    server.close();
  });

  it('should upload with csrf', done => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', __filename);
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'egg');
    // https://snyk.io/vuln/npm:qs:20170213
    form.field('[', 'toString');

    const headers = form.headers();
    headers.Cookie = cookies;
    urllib.request(`${host}/upload?_csrf=${csrfToken}`, {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      assert(!err);
      assert(res.statusCode === 200);
      const data = JSON.parse(body);
      assert(data.filename === 'multipart.test.js');
      assert.deepEqual(data.fields, {
        foo: 'fengmk2',
        love: 'egg',
        '[': 'toString',
      });
      done();
    });
  });
});
