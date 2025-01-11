import { strict as assert } from 'node:assert';
import { request } from '@eggjs/supertest';
import formstream from 'formstream';
import urllib from 'urllib';
import { createApp, MockApplication, getFilepath } from '../../utils.js';

describe('test/lib/plugins/multipart.test.ts', () => {
  let app: MockApplication;
  let csrfToken: string;
  let cookies: string;
  let host: string;
  let server: any;
  before(() => {
    app = createApp('apps/multipart');
    return app.ready();
  });
  before(done => {
    server = app.listen();
    request(server)
      .get('/')
      .expect(200, (err, res) => {
        csrfToken = res.headers['x-csrf'];
        cookies = (res.headers['set-cookie'] as any).join(';');
        host = `http://127.0.0.1:${server.address().port}`;
        done(err);
      });
  });

  after(() => {
    server.close();
    return app.close();
  });

  it('should upload with csrf', async () => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', getFilepath('../../package.json'));
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'egg');
    // https://snyk.io/vuln/npm:qs:20170213
    form.field('[', 'toString');

    const headers = form.headers();
    headers.Cookie = cookies;
    const res = await urllib.request(`${host}/upload?_csrf=${csrfToken}`, {
      method: 'POST',
      headers,
      stream: form as any,
      dataType: 'json',
    });
    assert.equal(res.statusCode, 200);
    const data = res.data;
    // console.log(data);
    assert.equal(data.filename, 'package.json');
    assert.deepEqual(data.fields, {
      foo: 'fengmk2',
      love: 'egg',
      '[': 'toString',
    });
  });
});
