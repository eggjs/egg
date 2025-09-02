import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import mm, { MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_request.test.ts', () => {
  describe('app mode', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('request'),
      });
      return app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should test app with request', async () => {
      await app.httpRequest().get('/').expect(200).expect('hello world');
    });

    it('should test app with request on pathFor', async () => {
      await app.httpRequest().get('home').expect(200).expect('hello world');
    });

    it('should GET session path work', async () => {
      await app
        .httpRequest()
        .get('session')
        .expect(200)
        .expect('hello session');
    });

    it('should GET wrong pathFor name throw error', async () => {
      try {
        await app
          .httpRequest()
          .get('session-404')
          .expect(200)
          .expect('hello world');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err);
        assert(
          err.message ===
            "Can't find router:session-404, please check your 'app/router.js'"
        );
      }
    });

    it('should test with expectHeader(header) and unexpectHeader(header)', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world')
        .expectHeader('set-cookie')
        .unexpectHeader('cache-control');
    });

    it('should test with expectHeader(header) and unexpectHeader(header) throw error', async () => {
      try {
        await app
          .httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .expectHeader('set-cookie1');
      } catch (err: any) {
        assert(err.message === 'expected "set-cookie1" header field');
      }

      try {
        await app
          .httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .unexpectHeader('set-cookie');
      } catch (err: any) {
        assert(
          err.message.startsWith('unexpected "set-cookie" header field, got "')
        );
      }
    });

    it('should test with expectHeader(header, done)', async () => {
      await app.httpRequest().get('/').expectHeader('set-cookie');
    });

    it('should test with unexpectHeader(header, done)', async () => {
      await app.httpRequest().get('/').unexpectHeader('cache-control');
    });
  });

  describe('cluster mode', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.cluster({
        baseDir: getFixtures('request'),
      });
      return app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should test app with request', async () => {
      await app.httpRequest().get('/').expect(200).expect('hello world');
    });

    it('should test app with request on pathFor', async () => {
      await app.httpRequest().get('home').expect(200).expect('hello world');
    });

    it('should GET session path work', async () => {
      await app
        .httpRequest()
        .get('session')
        .expect(200)
        .expect('hello session');
    });

    it('should GET wrong pathFor name throw error', async () => {
      try {
        await app
          .httpRequest()
          .get('session-404')
          .expect(200)
          .expect('hello world');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err);
        assert(
          err.message ===
            "Can't find router:session-404, please check your 'app/router.js'"
        );
      }
    });

    it('should test with expectHeader(header) and unexpectHeader(header)', async () => {
      return app
        .httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world')
        .expectHeader('set-cookie')
        .unexpectHeader('cache-control');
    });

    it('should test with expectHeader(header) and unexpectHeader(header) throw error', async () => {
      try {
        await app
          .httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .expectHeader('set-cookie1');
      } catch (err: any) {
        assert(err.message === 'expected "set-cookie1" header field');
      }

      try {
        await app
          .httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .unexpectHeader('set-cookie');
      } catch (err: any) {
        assert(
          err.message.startsWith('unexpected "set-cookie" header field, got "')
        );
      }
    });

    it('should test with expectHeader(header, done)', async () => {
      await app.httpRequest().get('/').expectHeader('set-cookie');
    });

    it('should test with unexpectHeader(header, done)', async () => {
      await app.httpRequest().get('/').unexpectHeader('cache-control');
    });
  });
});
