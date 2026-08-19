import { strict as assert } from 'node:assert';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

describe('test/cors.private-network.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', 'cors.private-network'),
    });
    return app.ready();
  });

  afterAll(() => app.close());

  afterEach(() => mm.restore());

  it('should not set `Access-Control-Allow-Private-Network` when request Access-Control-Request-Private-Network header missing', () => {
    return app
      .httpRequest()
      .get('/')
      .set('Origin', 'https://eggjs.org')
      .set('Access-Control-Request-Method', 'GET')
      .expect('Access-Control-Allow-Origin', 'https://eggjs.org')
      .expect({ foo: 'bar' })
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-private-network']);
      })
      .expect(200);
  });

  it('should not set `Access-Control-Allow-Private-Network` to non-OPTIONS request', () => {
    return app
      .httpRequest()
      .post('/')
      .set('Origin', 'https://eggjs.org')
      .set('Access-Control-Request-Private-Network', 'true')
      .expect('Access-Control-Allow-Origin', 'https://eggjs.org')
      .expect((res: any) => {
        assert(!res.headers['access-control-allow-private-network']);
      })
      .expect({ foo: 'bar' })
      .expect(200);
  });

  it('should set `Access-Control-Allow-Private-Network` on OPTIONS request', () => {
    app.mockCsrf();
    return app
      .httpRequest()
      .options('/')
      .set('Origin', 'https://eggjs.org')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Private-Network', 'true')
      .expect('Access-Control-Allow-Origin', 'https://eggjs.org')
      .expect('Access-Control-Allow-Private-Network', 'true')
      .expect(204);
  });
});
