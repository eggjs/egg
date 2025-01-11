import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { createApp, startLocalServer, MockApplication } from '../../utils.js';

describe('test/lib/core/httpclient_tracer_demo.test.ts', () => {
  let url: string;
  let app: MockApplication;

  before(() => {
    app = createApp('apps/tracer-demo');
    return app.ready();
  });
  before(async () => {
    url = await startLocalServer();
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

  it('should app logger support localStorage by default', async () => {
    const traceId = 'mock-traceId-123123';
    await app.httpRequest()
      .get('/foo?url=' + encodeURIComponent(url + '/get_headers'))
      .set('x-traceid', traceId)
      .expect(res => {
        assert(res.body.url === url + '/get_headers');
        assert(res.body.data['x-request-id']);
        assert(res.body.data['x-request-id'].startsWith('anonymous-'));
      })
      .expect(200);
    await scheduler.wait(2000);
    app.expectLog(/ INFO \d+ \[-\/127.0.0.1\/mock-traceId-123123\/[\d\.]+ms GET \/foo\?url=http%3A%2F%2F127.0.0.1%3A\d+%2Fget_headers] app logger support traceId/);
  });
});
