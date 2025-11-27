import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll, expect } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/middleware.test.ts', () => {
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

  it('global middleware should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/middleware/global')
      .expect(200)
      .expect((res) => {
        expect(res.body.count).toBe(0);
      });
  });

  it('method middleware should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/middleware/method')
      .expect(200)
      .expect((res) => {
        expect(res.body.log).toBe('use middleware');
      });
  });

  it('method middleware call module should work', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/middleware/methodCallModule').expect(200);
  });

  it('aop controller middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/aop/middleware/global').expect(200);
    expect(res.body).toEqual({
      method: 'global',
      count: 0,
      aopList: ['FooControllerAdvice', 'CountAdvice'],
    });
  });

  it('aop method middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/aop/middleware/method').expect(200);
    expect(res.body).toEqual({
      method: 'middleware',
      aopList: ['FooControllerAdvice', 'CountAdvice', 'BarMethodAdvice', 'FooMethodAdvice'],
      count: 0,
    });
  });
});
