import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';
import { TestAgent } from '@eggjs/supertest';
import snapshot from 'snap-shot-it';

describe('test/csrf.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;

  before(async () => {
    app = mm.app({
      baseDir: 'apps/csrf',
    });
    await app.ready();
    app2 = mm.app({
      baseDir: 'apps/csrf-multiple',
    });
    await app2.ready();
  });

  after(async () => {
    await app.close();
    await app2.close();
  });

  afterEach(mm.restore);

  it('should throw when session disabled and useSession enabled', async () => {
    try {
      const app = mm.app({ baseDir: 'apps/csrf-session-disable' });
      await app.ready();
      throw new Error('should not execute');
    } catch (err: any) {
      assert.equal(err.message, 'csrf.useSession enabled, but session plugin is disabled');
    }
  });

  it('should update form with csrf token', async () => {
    snapshot(app.config.security.csrf);
    const agent = new TestAgent(app.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const csrfToken = res.text;
    res = await agent
      .post('/update')
      .set('content-type', 'application/x-www-form-urlencoded')
      .send({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update form with csrf token rotate', async () => {
    const agent = new TestAgent(app.callback());
    await agent.get('/').set('accept', 'text/html').expect(200);
    let res = await agent.get('/rotate').set('accept', 'text/html').expect(200);
    assert(res.text);
    const csrfToken = res.text;
    res = await agent
      .post('/update')
      .set('content-type', 'application/x-www-form-urlencoded')
      .send({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should not set cookie when rotate without csrf token', async () => {
    await app
      .httpRequest()
      .get('/api/rotate')
      .set('accept', 'text/html')
      .expect(200)
      .expect('')
      .expect(res => {
        assert(!res.header['set-cookie']);
      });
  });

  it('should update form with csrf token using session', async () => {
    mm(app.config.security.csrf, 'useSession', true);
    const agent = new TestAgent(app.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const csrfToken = res.text;
    res = await agent
      .post('/update')
      .set('content-type', 'application/x-www-form-urlencoded')
      .send({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update json with csrf token using session', async () => {
    mm(app.config.security.csrf, 'useSession', true);
    const agent = new TestAgent(app.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const csrfToken = res.text;
    res = await agent
      .post('/update')
      .send({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update form with csrf token from cookie and set to header', async () => {
    const agent = new TestAgent(app.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const cookie = res.headers['set-cookie'][0];
    const csrfToken = cookie.match(/csrfToken=(.*?);/)![1];
    res = await agent
      .post('/update')
      .set('x-csrf-token', csrfToken)
      .send({
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update form with csrf token from cookie and set to query', async () => {
    const agent = new TestAgent(app.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const cookie = res.headers['set-cookie'][0];
    const csrfToken = cookie.match(/csrfToken=(.*?);/)![1];
    res = await agent
      .post(`/update?_csrf=${csrfToken}`)
      .send({
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update form with csrf token from cookie and support multiple query input', async () => {
    const agent = new TestAgent(app2.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const cookie = res.headers['set-cookie'] as any;
    const csrfToken = cookie.join(';').match(/csrfToken=(.*?);/)![1];
    const ctoken = cookie.join(';').match(/ctoken=(.*?);/)![1];
    assert.equal(ctoken, csrfToken);
    res = await agent
      .post(`/update?_csrf=${csrfToken}`)
      .send({
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        title: `ok token: ${csrfToken}`,
      });
    res = await agent
      .post(`/update?_csgo=${csrfToken}`)
      .send({
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        title: `ok token: ${csrfToken}`,
      });

    res = await agent
      .post(`/update?_csgo=${csrfToken}`)
      .set('cookie', `csrfToken=${csrfToken}`)
      .send({
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        title: `ok token: ${csrfToken}`,
      });

    res = await agent
      .post(`/update?_csgo=${csrfToken}`)
      .set('cookie', `ctoken=${csrfToken}`)
      .send({
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update form with csrf token from cookie and set to body', async () => {
    const agent = new TestAgent(app.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const cookie = res.headers['set-cookie'][0];
    const csrfToken = cookie.match(/csrfToken=(.*?);/)![1];
    res = await agent
      .post('/update')
      .send({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
  });

  it('should update form with csrf token from cookie and and support multiple body input', async () => {
    const agent = new TestAgent(app2.callback());
    let res = await agent.get('/').set('accept', 'text/html').expect(200);
    assert(res.text);
    const cookie = res.headers['set-cookie'][1];
    const csrfToken = cookie.match(/csrfToken=(.*?);/)![1];
    res = await agent
      .post('/update')
      .send({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csrf: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
    res = await agent
      .post('/update')
      .send({
        _csgo: csrfToken,
        title: `ok token: ${csrfToken}`,
      })
      .expect(200)
      .expect({
        _csgo: csrfToken,
        title: `ok token: ${csrfToken}`,
      });
  });

  it('token should be rotated when enable rotateWhenInvalid', async () => {
    mm(app.config.security.csrf, 'rotateWhenInvalid', true);
    await app
      .httpRequest()
      .post('/update')
      .set('x-csrf-token', '2')
      .set('cookie', 'csrfToken=1')
      .send({ title: 'invalid token' })
      .expect(403)
      .expect(res => assert(!!res.header['set-cookie']));
  });

  it('should show deprecate message if ignoreJSON = true', async () => {
    const app = mm.app({ baseDir: 'apps/csrf-ignorejson' });
    await app.ready();
    // will show deprecate message
  });

  it('should ignore json if ignoreJSON = true', async () => {
    mm(app.config.security.csrf, 'ignoreJSON', true);
    await app
      .httpRequest()
      .post('/update')
      .send({
        title: 'without token ok',
      })
      .expect(200)
      .expect({
        title: 'without token ok',
      });
  });

  it('should ignore json if ignoreJSON = true and body not exist', async () => {
    mm(app.config.security.csrf, 'ignoreJSON', true);
    await app
      .httpRequest()
      .post('/update')
      .set('content-length', '0')
      .set('content-type', 'application/json')
      .expect(200)
      .expect({});
  });

  it('should not ignore form if ignoreJSON = true', async () => {
    mm(app.config.security.csrf, 'ignoreJSON', true);
    await app
      .httpRequest()
      .post('/update')
      .set('content-type', 'application/x-www-form-urlencoded')
      .send({
        title: 'without token ok',
      })
      .expect(403);
  });

  it('should return 403 update form without csrf token', async () => {
    const agent = new TestAgent(app.callback());
    await agent.get('/').set('accept', 'text/html').expect(200);

    await agent
      .post('/update')
      .set('accept', 'text/html')
      .expect(403)
      .expect(/invalid csrf token/);
  });

  it('should return 403 and log debug info in local env', async () => {
    mm(app.config, 'env', 'local');
    app.mockLog();
    const agent = new TestAgent(app.callback());
    await agent.get('/').set('accept', 'text/html').expect(200);

    const res = await agent.post('/update').set('accept', 'text/html').expect(403);
    assert.match(res.text, /invalid csrf token/);
    app.expectLog('invalid csrf token. See http');
  });

  it('should return 403 update form without csrf secret', async () => {
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .expect(403)
      .expect(/missing csrf token/);
  });

  it('should return 403 and log debug info in local env', async () => {
    mm(app.config, 'env', 'local');
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .expect(403)
      .expect(/missing csrf token/);
    app.expectLog('missing csrf token. See http');
  });

  it('should support ignore paths', async () => {
    await app
      .httpRequest()
      .post('/update')
      .send({
        foo: 'bar',
      })
      .expect(403);

    await app
      .httpRequest()
      .post('/api/update')
      .send({
        foo: 'bar',
      })
      .expect(404);

    await app
      .httpRequest()
      .post('/api/users/posts')
      .send({
        foo: 'bar',
      })
      .expect(404);
  });

  it('should support ignore function', async () => {
    await app
      .httpRequest()
      .post('/update')
      .send({
        foo: 'bar',
      })
      .expect(403);

    await app
      .httpRequest()
      .post('/update')
      .send({
        foo: 'bar',
      })
      .set('ignore-csrf', 'true')
      .expect(200);
  });

  it('should got next when is GET/HEAD/OPTIONS/TRACE method', async () => {
    await app.httpRequest().get('/update.json;').expect(404);

    await app.httpRequest().head('/update.tile;').expect(404);

    await app.httpRequest().options('/update.ajax;').expect(404);
    // await (app as any).httpRequest()
    //   .trace('/update.ajax;')
    //   .expect(404);
  });

  it('should throw 500 if ctx.assertCsrf() throw not 403 error', async () => {
    mm.syncError(app.context, 'assertCsrf', 'mock assertCsrf error');

    await app.httpRequest().post('/foo').expect(500);
  });

  it('should assertCsrf ignore path', () => {
    const ctx = app2.mockContext({
      path: '/api/foo',
    });
    ctx.assertCsrf();
  });

  it('should assertCsrf throw if not ignore', function (done) {
    const ctx = app2.mockContext({
      path: '/foo/bar',
    });
    try {
      ctx.assertCsrf();
    } catch (err) {
      assert((err as Error).message, 'missing csrf token');
      done();
    }
  });

  it('should return 200 with correct referer or origin when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    mm(app.config.security.csrf, 'refererWhiteList', ['.nodejs.org']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://nodejs.org/en/')
      .expect(200);

    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://nodejs.org/en/')
      .expect(200);
  });

  it('should return 403 with correct referer or origin when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    mm(app.config.security.csrf, 'refererWhiteList', ['nodejs.org']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://wwwnodejs.org/en/')
      .expect(403);

    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://wwwnodejs.org/en/')
      .expect(403);
  });

  it('should return 200 with same root host when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://www.nodejs.org/en/')
      .set('host', 'nodejs.org')
      .expect(200);
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://nodejs.org/en/')
      .set('host', 'nodejs.org')
      .expect(200);

    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://www.nodejs.org/en/')
      .set('host', 'nodejs.org')
      .expect(200);
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://nodejs.org/en/')
      .set('host', 'nodejs.org')
      .expect(200);
  });

  it('should return 403 with invalid host when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://wwwnodejs.org/en/')
      .set('host', 'nodejs.org')
      .expect(403);

    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://wwwnodejs.org/en/')
      .set('host', 'nodejs.org')
      .expect(403);
  });

  it('should return 403 with evil referer or origin when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    mm(app.config.security.csrf, 'refererWhiteList', ['nodejs.org']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://nodejs.org!.evil.com/en/')
      .expect(403);
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://nodejs.org!.evil.com/en/')
      .expect(403);
  });

  it('should return 403 with illegal referer or origin when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    mm(app.config.security.csrf, 'refererWhiteList', ['nodejs.org']);
    app.mockLog();
    await app.httpRequest().post('/update').set('accept', 'text/html').set('referer', '/en/').expect(403);
    await app.httpRequest().post('/update').set('accept', 'text/html').set('origin', '/en/').expect(403);
  });

  it('should return 200 with same domain request', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    app.mockLog();
    const httpRequestObj = app.httpRequest().post('/update') as any;
    const port = httpRequestObj.app.address().port;
    await httpRequestObj.set('accept', 'text/html').set('referer', `http://127.0.0.1:${port}/`).expect(200);

    const httpRequestObj2 = app.httpRequest().post('/update') as any;
    const port2 = httpRequestObj2.app.address().port;
    await httpRequestObj2.set('accept', 'text/html').set('origin', `http://127.0.0.1:${port2}/`).expect(200);
  });

  it('should return 403 with different domain request', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://nodejs.org/en/')
      .expect(403)
      .expect(/invalid csrf referer or origin/);

    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://nodejs.org/en/')
      .expect(403)
      .expect(/invalid csrf referer or origin/);
  });

  it('should check both ctoken and referer when type is all', async () => {
    mm(app.config.security.csrf, 'type', 'all');
    mm(app.config.security.csrf, 'refererWhiteList', ['https://eggjs.org/']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://eggjs.org/en/')
      .expect(403)
      .expect(/missing csrf token/);
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://eggjs.org/en/')
      .expect(403)
      .expect(/missing csrf token/);
    await app
      .httpRequest()
      .post('/update')
      .send({ _csrf: '1' })
      .set('accept', 'text/html')
      .set('cookie', 'csrfToken=1')
      .expect(403)
      .expect(/missing csrf referer or origin/);
  });

  it('should check one of ctoken and referer when type is any', async () => {
    mm(app.config.security.csrf, 'type', 'any');
    mm(app.config.security.csrf, 'refererWhiteList', ['.eggjs.org']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://eggjs.org/en/')
      .expect(200);
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('origin', 'https://eggjs.org/en/')
      .expect(200);
    await app
      .httpRequest()
      .post('/update')
      .send({ _csrf: '1' })
      .set('accept', 'text/html')
      .set('cookie', 'csrfToken=1')
      .expect(200);
    await app
      .httpRequest()
      .post('/update')
      .send({ _csrf: '123' })
      .set('accept', 'text/html')
      .set('cookie', 'csrfToken=1')
      .expect(403)
      .expect(/ForbiddenError: both ctoken and referer check error: invalid csrf token, missing csrf referer/);
  });

  it('should return 403 without referer or origin when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    mm(app.config.security.csrf, 'refererWhiteList', ['https://eggjs.org/']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .expect(403)
      .expect(/missing csrf referer/);
    app.expectLog('missing csrf referer or origin. See http');
  });

  it('should return 403 with invalid referer or origin when type is referer', async () => {
    mm(app.config, 'env', 'local');
    mm(app.config.security.csrf, 'type', 'referer');
    mm(app.config.security.csrf, 'refererWhiteList', ['https://eggjs.org/']);
    app.mockLog();
    await app
      .httpRequest()
      .post('/update')
      .set('accept', 'text/html')
      .set('referer', 'https://nodejs.org/en/')
      .expect(403)
      .expect(/invalid csrf referer or origin/);
    app.expectLog('invalid csrf referer or origin. See http');
  });

  it('should throw with error type', async () => {
    const app = mm.app({
      baseDir: 'apps/csrf-error-type',
    });
    await assert.rejects(async () => {
      await app.ready();
    }, /Invalid enum value. Expected 'ctoken' \| 'referer' \| 'all' \| 'any', received 'test'/);
    await app.close();
  });

  it('should works without error with csrf.enable = false', async () => {
    const app = mm.app({
      baseDir: 'apps/csrf-enable-false',
    });
    await app.ready();
    await app.httpRequest().post('/update').set('accept', 'text/html').expect(200);
    await app.close();
  });

  describe('apps/csrf-supported-requests', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/csrf-supported-requests',
      });
      return app.ready();
    });

    after(() => app.close());

    it('should works without error', async () => {
      await app.httpRequest().post('/').set('accept', 'text/html').expect(200);
    });

    it('should throw with error type', async () => {
      await app
        .httpRequest()
        .post('/update')
        .set('accept', 'text/html')
        .expect(403)
        .expect(/missing csrf token/);
    });

    it('should throw with error type', async () => {
      await app
        .httpRequest()
        .get('/api/rotate')
        .set('accept', 'text/html')
        .expect(403)
        .expect(/missing csrf token/);
    });
  });

  describe('apps/csrf-supported-override-default', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/csrf-supported-override-default',
      });
      return app.ready();
    });

    after(() => app.close());

    it('should works without error', async () => {
      await app.httpRequest().post('/').set('accept', 'text/html').expect(200);

      await app.httpRequest().post('/update').set('accept', 'text/html').expect(200);
    });

    it('should throw with error type', async () => {
      await app
        .httpRequest()
        .post('/api/rotate')
        .set('accept', 'text/html')
        .expect(403)
        .expect(/missing csrf token/);

      await app
        .httpRequest()
        .post('/api/foo')
        .set('accept', 'text/html')
        .expect(403)
        .expect(/missing csrf token/);
    });
  });

  describe('apps/csrf-supported-requests-default-config', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/csrf-supported-requests-default-config',
      });
      return app.ready();
    });

    after(() => app.close());

    it('should works without error because csrf = false override default config', async () => {
      snapshot(app.config.security.csrf);
      const res = await app.httpRequest().get('/').set('accept', 'text/html').expect(200);
      assert.equal(res.body.csrf, '');
      assert.equal(res.body.env, 'unittest');
      assert.deepEqual(res.body.supportedRequestsMethods, ['POST', 'PATCH', 'DELETE', 'PUT', 'CONNECT']);
      await app.httpRequest().post('/update').expect(200);
    });
  });
});
