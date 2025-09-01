import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';

describe('test/mock_request.test.ts', () => {
  describe('app mode', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'request',
      });
      return app.ready();
    });
    after(() => app.close());
    afterEach(mm.restore);

    it('should test app with request', () => {
      return app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world');
    });

    it('should test app with request on pathFor', () => {
      return app.httpRequest()
        .get('home')
        .expect(200)
        .expect('hello world');
    });

    it('should GET session path work', () => {
      return app.httpRequest()
        .get('session')
        .expect(200)
        .expect('hello session');
    });

    it('should GET wrong pathFor name throw error', () => {
      try {
        app.httpRequest()
          .get('session-404')
          .expect(200)
          .expect('hello world');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err);
        assert(err.message === 'Can\'t find router:session-404, please check your \'app/router.js\'');
      }
    });

    it('should test with expectHeader(header) and unexpectHeader(header)', () => {
      return app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world')
        .expectHeader('set-cookie')
        .unexpectHeader('cache-control');
    });

    it('should test with expectHeader(header) and unexpectHeader(header) throw error', async () => {
      try {
        await app.httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .expectHeader('set-cookie1');
      } catch (err: any) {
        assert(err.message === 'expected "set-cookie1" header field');
      }

      try {
        await app.httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .unexpectHeader('set-cookie');
      } catch (err: any) {
        assert(err.message.startsWith('unexpected "set-cookie" header field, got \"'));
      }
    });

    it('should test with expectHeader(header, done)', done => {
      app.httpRequest()
        .get('/')
        .expectHeader('set-cookie', done);
    });

    it('should test with unexpectHeader(header, done)', done => {
      app.httpRequest()
        .get('/')
        .unexpectHeader('cache-control', done);
    });
  });

  describe('cluster mode', () => {
    let app: MockApplication;
    before(() => {
      app = mm.cluster({
        baseDir: 'request',
      });
      return app.ready();
    });
    after(() => app.close());
    afterEach(mm.restore);

    it('should test app with request', () => {
      return app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world');
    });

    it('should test app with request on pathFor', () => {
      return app.httpRequest()
        .get('home')
        .expect(200)
        .expect('hello world');
    });

    it('should GET session path work', () => {
      return app.httpRequest()
        .get('session')
        .expect(200)
        .expect('hello session');
    });

    it('should GET wrong pathFor name throw error', () => {
      try {
        app.httpRequest()
          .get('session-404')
          .expect(200)
          .expect('hello world');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err);
        assert(err.message === 'Can\'t find router:session-404, please check your \'app/router.js\'');
      }
    });

    it('should test with expectHeader(header) and unexpectHeader(header)', () => {
      return app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world')
        .expectHeader('set-cookie')
        .unexpectHeader('cache-control');
    });

    it('should test with expectHeader(header) and unexpectHeader(header) throw error', async () => {
      try {
        await app.httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .expectHeader('set-cookie1');
      } catch (err: any) {
        assert(err.message === 'expected "set-cookie1" header field');
      }

      try {
        await app.httpRequest()
          .get('/')
          .expect(200)
          .expect('hello world')
          .unexpectHeader('set-cookie');
      } catch (err: any) {
        assert(err.message.startsWith('unexpected "set-cookie" header field, got \"'));
      }
    });

    it('should test with expectHeader(header, done)', done => {
      app.httpRequest()
        .get('/')
        .expectHeader('set-cookie', done);
    });

    it('should test with unexpectHeader(header, done)', done => {
      app.httpRequest()
        .get('/')
        .unexpectHeader('cache-control', done);
    });
  });
});
