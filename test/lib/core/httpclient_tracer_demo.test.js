'use strict';

const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/core/httpclient_tracer_demo.test.js', () => {
  let url;
  let app;

  before(() => {
    app = utils.app('apps/tracer-demo');
    return app.ready();
  });
  before(async () => {
    url = await utils.startLocalServer();
  });

  after(() => app.close());

  it('should send request with ctx.httpclient', async () => {
    const r = await app.curl(url + '/get_headers', {
      dataType: 'json',
    });
    assert(r.status === 200);
    assert(r.data['x-request-id'].startsWith('anonymous-'));
  });

  it('should work with context httpclient', () => {
    return app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(res => {
        assert(res.body.url === url + '/get_headers');
        assert(res.body.data['x-request-id']);
        assert(!res.body.data['x-request-id'].startsWith('anonymous-'));
      })
      .expect(200);
  });
});
