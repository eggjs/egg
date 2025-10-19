import { describe, it, afterEach, beforeAll, afterAll, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/edgecase.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/controller-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('redirect should work', async () => {
    await app.httpRequest().get('/redirect').expect('location', 'https://alipay.com/').expect(302);
  });

  it('empty should work', async () => {
    await app.httpRequest().get('/empty').expect(204);
  });

  it('should case sensitive', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/Middleware/Method')
      .expect(200)
      .expect(res => {
        expect(res.text).toBe('hello, view');
      });
  });
});
