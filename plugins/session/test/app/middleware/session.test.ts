import assert from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { request, TestAgent } from '@eggjs/supertest';
import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

describe('test/app/middlewares/session.test.js', () => {
  let app: MockApplication;
  let agent: TestAgent;
  afterEach(mm.restore);

  describe('sessionStore', () => {
    beforeAll(() => {
      app = mm.app({ baseDir: 'memory-session' });
      return app.ready();
    });
    beforeEach(() => {
      agent = new TestAgent(app.callback());
    });
    afterAll(() => app.close());

    it.skip('should keep session config stable', () => {
      // TODO: Replace snapshot with vitest snapshot
      // snapshot(app.config.session);
    });

    it('should get sessionStore', async () => {
      mm.empty(app.sessionStore, 'set');
      await agent
        .get('/set?foo=bar')
        .expect(200)
        .expect({ foo: 'bar' })
        .expect('set-cookie', /EGG_SESS=.*?;/);

      await agent.get('/get').expect(200).expect({});
    });

    it('should session store can be change', async () => {
      mm(app.config, 'env', 'local');

      await agent
        .get('/set?foo=bar')
        .expect(200)
        .expect({ foo: 'bar' })
        .expect(res => {
          const cookie = res.get('Set-Cookie')!.join('|');
          assert(!cookie.includes('; samesite=none;'));
        })
        .expect('set-cookie', /EGG_SESS=.*?;/);

      await agent.get('/get').expect(200).expect({ foo: 'bar' });

      app.sessionStore = null;

      await agent.get('/get').expect(200).expect({});
    });
  });

  describe('httpOnly', () => {
    it('should warn when httponly false', async () => {
      app = mm.app({ baseDir: 'httponly-false-session' });
      await app.ready();
      app.expectLog(
        '[@eggjs/session]: please set `config.session.httpOnly` to true. It is very dangerous if session can read by client JavaScript.',
        'coreLogger'
      );
      await app.close();
    });
  });

  describe('sameSite', () => {
    beforeAll(() => {
      app = mm.app({ baseDir: 'samesite-none-session' });
      return app.ready();
    });
    beforeEach(() => {
      agent = new TestAgent(app.callback());
    });
    afterAll(() => app.close());

    it('should work with sameSite=none', async () => {
      await agent
        .get('/set?foo=bar')
        .set(
          'user-agent',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36'
        )
        .set('x-forwarded-proto', 'https')
        .expect(200)
        .expect({ foo: 'bar' })
        .expect(res => {
          const cookie = res.get('Set-Cookie')!.join('|');
          assert(cookie.includes('; samesite=none;'));
        });
    });
  });

  describe('chips', () => {
    beforeAll(() => {
      app = mm.app({ baseDir: 'chips' });
      return app.ready();
    });
    beforeEach(() => {
      agent = new TestAgent(app.callback());
    });
    afterAll(() => app.close());

    it('should work with chips', async () => {
      await agent
        .get('/set?foo=bar')
        .set(
          'user-agent',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.4044.138 Safari/537.36'
        )
        .set('x-forwarded-proto', 'https')
        .expect(200)
        .expect({ foo: 'bar' })
        .expect(res => {
          const cookies = res.headers['set-cookie'];
          console.log(cookies);
        });
    });
  });

  describe('logValue', () => {
    beforeAll(() => {
      app = mm.app({ baseDir: 'logValue-false-session' });
      return app.ready();
    });
    beforeEach(() => {
      agent = new TestAgent(app.callback());
      app.mockLog();
    });
    afterAll(() => app.close());

    it('when logValue is true, should log the session value', async () => {
      let cookie = '';
      app.mockLog();
      mm(app.config.session, 'logValue', true);

      await agent
        .get('/maxAge?maxAge=100')
        .expect(200)
        .expect(res => {
          cookie = res.get('Set-Cookie')!.join(';');
        });

      await scheduler.wait(200);

      await request(app.callback()).get('/get').set('cookie', cookie).expect(200).expect({});
      app.notExpectLog('[session][expired] key(undefined) value("")', 'coreLogger');
    });

    it('when logValue is false, should not log the session value', async () => {
      mm(app.config.session, 'logValue', false);
      app.mockLog();
      let cookie = '';

      await agent
        .get('/maxAge?maxAge=100')
        .expect(200)
        .expect(res => {
          cookie = res.get('Set-Cookie')!.join(';');
        });

      await scheduler.wait(200);

      await request(app.callback()).get('/get').set('cookie', cookie).expect(200).expect({});

      await scheduler.wait(1000);

      app.expectLog('[session][expired] key(undefined) value("")', 'coreLogger');
    });

    it('when logValue is false, valid false, should not log the session value', async () => {
      mm(app.config.session, 'logValue', false);
      mm(app.config.session, 'valid', () => false);
      app.mockLog();

      await agent.get('/set?foo=bar').expect(200).expect({ foo: 'bar' });

      await agent.get('/get');

      await scheduler.wait(1000);

      app.expectLog('[session][invalid] key(undefined) value("")', 'coreLogger');
    });
  });

  describe('session maxage', () => {
    beforeAll(() => {
      app = mm.app({ baseDir: 'session-maxage-session' });
      return app.ready();
    });
    beforeEach(() => {
      agent = new TestAgent(app.callback());
    });
    afterAll(() => app.close());

    it('should work with maxage=ession', async () => {
      await agent
        .get('/set?foo=bar')
        .set(
          'user-agent',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36'
        )
        .set('x-forwarded-proto', 'https')
        .expect(200)
        .expect({ foo: 'bar' })
        .expect(res => {
          const cookie = res.get('Set-Cookie')!.join('|');
          assert(!cookie.includes('expires'));
          assert(!cookie.includes('max-age'));
        });
    });

    it('should ctx.session.maxAge=session work', async () => {
      await agent
        .get('/maxAge?maxAge=session')
        .expect(200)
        .expect(res => {
          const cookie = res.get('Set-Cookie')!.join(';');
          assert(cookie.match(/EGG_SESS=.*?;/));
          assert(!cookie.includes('expires'));
          assert(!cookie.includes('max-age'));
        });
    });
  });

  ['cookie-session', 'memory-session', 'memory-session-generator', 'redis-session'].forEach(name => {
    describe(name, () => {
      beforeAll(() => {
        app = mm.app({
          baseDir: name,
          cache: false,
        });
        return app.ready();
      });
      beforeEach(() => {
        agent = new TestAgent(app.callback());
      });
      afterAll(() => app.close());

      if (name === 'redis-session') {
        it('should get with ', async () => {
          await agent
            .get('/set?foo=bar')
            .expect(200)
            .expect({ foo: 'bar' })
            .expect('set-cookie', /EGG_SESS=.*?;/);

          mm.empty(app.redis, 'get');

          await agent.get('/get').expect(200).expect({});
        });
      }

      it('should get empty session and do not set cookie when session not populated', async () => {
        await agent
          .get('/get')
          .expect(200)
          .expect({})
          .expect(res => {
            assert(
              !res
                .get('Set-Cookie')!
                .join('')
                .match(/EGG_SESS/)
            );
          });
      });

      it('should ctx.session= change the session', async () => {
        await agent
          .get('/set?foo=bar')
          .expect(200)
          .expect({ foo: 'bar' })
          .expect('set-cookie', /EGG_SESS=.*?;/);
      });

      it('should ctx.session.key= change the session', async () => {
        await agent
          .get('/set?key=foo&foo=bar')
          .expect(200)
          .expect({ key: 'foo', foo: 'bar' })
          .expect('set-cookie', /EGG_SESS=.*?;/);

        await agent
          .get('/setKey?key=bar')
          .expect(200)
          .expect({ key: 'bar', foo: 'bar' })
          .expect('set-cookie', /EGG_SESS=.*?;/);
      });

      it('should ctx.session=null remove the session', async () => {
        await agent
          .get('/set?key=foo&foo=bar')
          .expect(200)
          .expect({ key: 'foo', foo: 'bar' })
          .expect('set-cookie', /EGG_SESS=.*?;/);

        await agent
          .get('/remove')
          .expect(204)
          .expect('set-cookie', /EGG_SESS=;/);

        await agent.get('/get').expect(200).expect({});
      });

      it('should ctx.session.maxAge= change maxAge', async () => {
        await agent
          .get('/set?key=foo&foo=bar')
          .expect(200)
          .expect({ key: 'foo', foo: 'bar' })
          .expect('set-cookie', /EGG_SESS=.*?;/);

        let cookie = '';

        await agent
          .get('/maxAge?maxAge=100')
          .expect(200)
          .expect({ key: 'foo', foo: 'bar' })
          .expect(res => {
            cookie = res.get('Set-Cookie')!.join(';');
            assert(cookie.match(/EGG_SESS=.*?;/));
            assert(cookie.match(/expires=/));
            assert(cookie.match(/max-age=/));
          });

        await scheduler.wait(200);

        await agent.get('/get').expect(200).expect({});

        await request(app.callback()).get('/get').set('cookie', cookie).expect(200).expect({});
      });
    });
  });
});
