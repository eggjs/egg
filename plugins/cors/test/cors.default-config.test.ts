import { strict as assert } from 'node:assert';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

describe('test/cors.default-config.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', 'cors-default-config'),
    });
    return app.ready();
  });

  afterAll(() => app.close());

  afterEach(() => mm.restore());

  it('should not set `Access-Control-Allow-Origin` when request Origin header missing', () => {
    return app
      .httpRequest()
      .get('/')
      .expect({ foo: 'bar' })
      .expect((res: any) => {
        assert.equal(res.headers['access-control-allow-origin'], undefined);
      })
      .expect(200);
  });

  it('should hasCustomOriginHandler set to false', () => {
    return app.httpRequest().get('/config').expect({ hasCustomOriginHandler: false }).expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` to request origin header', () => {
    app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://eggjs.org')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect({ foo: 'bar' })
      .expect((res: any) => {
        assert.equal(res.headers['access-control-allow-origin'], undefined);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` to request origin header with second-level domain', () => {
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://test.eggjs.org')
      .expect({ foo: 'bar' })
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-origin']);
        assert(!res.headers['access-control-allow-credentials']);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` to when white list domain is empty', () => {
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'https://a.com')
      .expect({ foo: 'bar' })
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-origin']);
        assert(!res.headers['access-control-allow-credentials']);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` on POST request', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .post('/')
      .set('Origin', 'http://eggjs.org')
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-origin']);
        assert(!res.headers['access-control-allow-credentials']);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` when origin not in white list', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://eggjs-black.org')
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-origin']);
        assert(!res.headers['access-control-allow-credentials']);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` when origin = http://eggjs.org!.evil.com', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://eggjs.org!.evil.com')
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-origin']);
        assert(!res.headers['access-control-allow-credentials']);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Origin` when origin = /foo', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .get('/')
      .set('Origin', '/foo')
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-origin']);
        assert(!res.headers['access-control-allow-credentials']);
      })
      .expect(200);
  });
});
