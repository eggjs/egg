import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll, expect } from '@voidzero-dev/vite-plus/test';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/acl.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/acl-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  describe('authenticate', () => {
    describe('authenticate success', () => {
      it('should ok', async () => {
        await app
          .httpRequest()
          .get('/foo?pass=true')
          .set('accept', 'application/json')
          .expect((res) => {
            expect(res.text).toBe('hello, foo');
          });
      });
    });

    describe('authenticate failed', () => {
      describe('json', () => {
        it('should deny', async () => {
          await app
            .httpRequest()
            .get('/foo')
            .set('accept', 'application/json')
            .expect((res) => {
              expect(res.body).toEqual({
                target: 'http://alipay.com/401',
                stat: 'deny',
              });
            });
        });
      });

      describe('not json', () => {
        it('should 302', async () => {
          await app.httpRequest().get('/foo').expect(302).expect('location', 'http://alipay.com/401');
        });
      });
    });
  });

  describe('authorize', () => {
    describe('authorize success', () => {
      it('should ok', async () => {
        await app
          .httpRequest()
          .get('/bar?pass=true&code=mock1')
          .set('accept', 'application/json')
          .expect((res) => {
            expect(res.text).toBe('hello, bar');
          });
      });
    });

    describe('authorize failed', () => {
      describe('json', () => {
        it('should deny', async () => {
          await app
            .httpRequest()
            .get('/bar?pass=true&code=mock2')
            .set('accept', 'application/json')
            .expect((res) => {
              expect(res.body).toEqual({
                target: 'http://alipay.com/403',
                stat: 'deny',
              });
            });
        });
      });

      describe('not json', () => {
        it('should 302', async () => {
          await app
            .httpRequest()
            .get('/bar?pass=true&code=mock2')
            .expect(302)
            .expect('location', 'http://alipay.com/403');
        });
      });
    });
  });
});
