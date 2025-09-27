import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/nosniff.test.ts', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/nosniff'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should return default no-sniff http header', async () => {
    await app.httpRequest().get('/').set('accept', 'text/html').expect('X-Content-Type-Options', 'nosniff').expect(200);
  });

  it('should not return download noopen http header', async () => {
    await app
      .httpRequest()
      .get('/disable')
      .set('accept', 'text/html')
      .expect(res => expect(res.headers['x-content-type-options']).toBeUndefined())
      .expect(200);
  });

  it('should disable nosniff on redirect 302', async () => {
    await app
      .httpRequest()
      .get('/redirect')
      .expect(res => expect(res.headers['x-content-type-options']).toBeUndefined())
      .expect('location', '/')
      .expect(302);
  });

  it('should disable nosniff on redirect 301', () => {
    return app
      .httpRequest()
      .get('/redirect301')
      .expect(res => expect(res.headers['x-content-type-options']).toBeUndefined())
      .expect('location', '/')
      .expect(301);
  });

  it('should disable nosniff on redirect 307', () => {
    return app
      .httpRequest()
      .get('/redirect307')
      .expect(res => expect(res.headers['x-content-type-options']).toBeUndefined())
      .expect('location', '/')
      .expect(307);
  });
});
