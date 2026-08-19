import { strict as assert } from 'node:assert';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

describe('test/cors.origin.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', 'cors.origin'),
    });
    return app.ready();
  });

  afterAll(() => app.close());

  afterEach(() => mm.restore());

  it('should alway set `Access-Control-Allow-Origin` to config.origin=string when request Origin header missing', () => {
    return app
      .httpRequest()
      .get('/')
      .expect({ foo: 'bar' })
      .expect((res: any) => {
        assert.equal(res.headers['access-control-allow-origin'], 'eggjs.org');
      })
      .expect(200);
  });

  it('should set `Access-Control-Allow-Origin` to request origin header', () => {
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://eggjs.org')
      .expect('Access-Control-Allow-Origin', 'eggjs.org')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect({ foo: 'bar' })
      .expect(200);
  });

  it('should set `Access-Control-Allow-Origin` on POST request', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .post('/')
      .set('Origin', 'http://eggjs.org')
      .expect('Access-Control-Allow-Origin', 'eggjs.org')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(200);
  });

  it('should set `Access-Control-Allow-Origin` equal to the config not the white list', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://eggjs-white.org')
      .expect('Access-Control-Allow-Origin', app.config.cors?.origin as string)
      .expect('access-control-allow-credentials', 'true')
      .expect(200);
  });
});
