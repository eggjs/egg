import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll, expect } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/params.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/controller-app'),
    });
    await app.ready();
  }, 30_000);

  afterAll(() => {
    return app.close();
  });

  it('body param should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .post('/apps')
      .send({
        name: 'foo',
        desc: 'mock-desc',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.traceId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });
  });

  it('headers param should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .post('/apps')
      .set('x-session-id', 'mock-session-id')
      .send({
        name: 'foo',
        desc: 'mock-desc',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.traceId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(res.body.sessionId).toBe('mock-session-id');
      });
  });

  it('query param should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps?name=foo')
      .expect(200)
      .expect((res) => {
        expect(res.body.traceId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(res.body.app).toEqual({
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('path param should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect((res) => {
        expect(res.body.traceId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(res.body.app).toEqual({
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('global middleware should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect((res) => {
        expect(res.body.traceId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(res.body.app).toEqual({
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('controller path param should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/foo/fooId/bar/barId')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          fooId: 'fooId',
          barId: 'barId',
        });
      });
  });
});
