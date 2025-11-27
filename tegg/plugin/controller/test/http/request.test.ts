import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll, expect } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/request.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/http-inject-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('Request should work', async () => {
    app.mockCsrf();
    const param = {
      name: 'foo',
      desc: 'mock-desc',
    };
    const headerKey = 'test-header';
    await app
      .httpRequest()
      .post('/apps/testRequest')
      .send(param)
      .set('test', headerKey)
      .set('cookie', 'test=foo')
      .expect(200)
      .expect((res) => {
        expect(res.body.headers.test).toBe(headerKey);
        expect(res.body.method).toBe('POST');
        expect(res.body.requestBody).toBe(JSON.stringify(param));
        expect(res.body.cookies).toBe('foo');
      });
  });
});
