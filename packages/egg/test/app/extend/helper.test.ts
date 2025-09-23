import { describe, it, beforeAll, afterAll } from 'vitest';
import { createApp, type MockApplication } from '../../utils.ts';

describe('test/app/extend/helper.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = createApp('apps/helper');
    await app.ready();
  });
  afterAll(() => app.close());

  describe('pathFor()', () => {
    it('should get home path url', async () => {
      await app.httpRequest().get('/pathFor').expect('/home').expect(200);
    });

    it('should get home path with params', async () => {
      await app.httpRequest().get('/pathFor?foo=bar').expect('/home?foo=bar').expect(200);
    });
  });

  describe('urlFor()', () => {
    it('should get full home url', async () => {
      await app
        .httpRequest()
        .get('/urlFor')
        .expect(/^http:\/\/127\.0\.0\.1:\d+\/home$/)
        .expect(200);
    });

    it('should get full home url with params', async () => {
      await app
        .httpRequest()
        .get('/urlFor?foo=1')
        .expect(/^http:\/\/127\.0\.0\.1:\d+\/home\?foo=1$/)
        .expect(200);
    });
  });

  describe('escape()', () => {
    it('should escape script', async () => {
      await app.httpRequest().get('/escape').expect('&lt;script&gt;').expect(200);
    });
  });

  describe('shtml()', () => {
    it('should ignore attribute if domain not in domainWhiteList', async () => {
      await app.httpRequest().get('/shtml-not-in-domain-whitelist').expect('true').expect(200);
    });
  });
});
