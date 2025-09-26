import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';
import { type Context } from 'egg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFixtures(name: string) {
  return path.join(__dirname, 'fixtures', name);
}

describe('test/onerror.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    mm.env('local');
    mm.consoleLevel('NONE');
    app = mm.app({ baseDir: getFixtures('onerror') });
    return app.ready();
  });
  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should set app.config.onerror.errorPageUrl work', () => {
    assert.equal(app.config.onerror.errorPageUrl, 'https://eggjs.com/500.html');
  });

  it('should handle error not in the req/res cycle with no ctx', async () => {
    mm.consoleLevel('NONE');
    const app = mm.app({
      baseDir: getFixtures('mock-test-error'),
    });
    await app.ready();
    const err = new Error('mock test error');
    app.emit('error', err, null);
    (err as any).status = 400;
    app.emit('error', err, null);
    app.close();
  });

  it('should handle status:-1 as status:500', async () => {
    await app
      .httpRequest()
      .get('/?status=-1')
      .expect(/<h1 class="box">Error in &#x2F;\?status&#x3D;-1<\/h1>/)
      .expect(500);
  });

  it('should handle status:undefined as status:500', async () => {
    await app
      .httpRequest()
      .get('/')
      .expect(/<div class="context">test error<\/div>/)
      .expect(500);
  });

  it('should handle not exists file in stack without error', async () => {
    await app
      .httpRequest()
      .get('/unknownFile')
      .expect(/<div class="context">test error<\/div>/)
      .expect(500);
  });

  it('should handle escape xss', async () => {
    await app
      .httpRequest()
      .get('/?message=<script></script>')
      .expect(/&lt;script&gt;&lt;&#x2F;script&gt;/)
      .expect(500);
  });

  it('should handle status:1 as status:500', async () => {
    await app
      .httpRequest()
      .get('/?status=1')
      .expect(/<div class="context">test error<\/div>/)
      .expect(500);
  });

  it('should handle status:400', async () => {
    await app
      .httpRequest()
      .get('/?status=400')
      .expect(/<div class="context">test error<\/div>/)
      .expect(400);
  });

  it('should return error json format when Accept is json', async () => {
    await app
      .httpRequest()
      .get('/user')
      .set('Accept', 'application/json')
      .expect(res => {
        assert(res.body);
        assert(res.body.message === 'test error');
        assert(res.body.stack.includes('Error: test error'));
        // should not includes error detail
        assert(!res.body.frames);
      })
      .expect(500);
  });

  it('should return error json format when request path match *.json', async () => {
    await app
      .httpRequest()
      .get('/user.json')
      .expect(res => {
        assert(res.body);
        assert(res.body.message === 'test error');
        assert(res.body.stack.includes('Error: test error'));
        assert(res.body.status === 500);
        assert(res.body.name === 'Error');
      })
      .expect(500);
  });

  it('should support custom accpets return err.stack', async () => {
    mm(app.config.onerror, 'accepts', (ctx: Context) => {
      if (ctx.get('x-requested-with') === 'XMLHttpRequest') return 'json';
      return 'html';
    });
    await app
      .httpRequest()
      .get('/user.json')
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(/"message":"test error"/)
      .expect(/"stack":/)
      .expect(500);
  });

  it('should return err.stack when unittest', async () => {
    mm(app.config, 'env', 'unittest');
    await app
      .httpRequest()
      .get('/user.json')
      .set('Accept', 'application/json')
      .expect(/"message":"test error"/)
      .expect(/"stack":/)
      .expect(500);
  });

  it('should return err status message', async () => {
    mm(app.config, 'env', 'prod');
    await app
      .httpRequest()
      .get('/user.json')
      .set('Accept', 'application/json')
      .expect({ message: 'Internal Server Error' })
      .expect(500);
  });

  it('should return err.errors', async () => {
    await app
      .httpRequest()
      .get('/user.json?status=400&errors=test')
      .set('Accept', 'application/json')
      .expect(/test/)
      .expect(400);
  });

  it('should return err json at prod env', async () => {
    mm(app.config, 'env', 'prod');
    await app
      .httpRequest()
      .get('/user.json?status=400&errors=test')
      .set('Accept', 'application/json')
      .expect(/test/)
      .expect({
        errors: 'test',
        message: 'test error',
      })
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(400);
  });

  it('should return 4xx html at prod env', async () => {
    mm(app.config, 'env', 'prod');
    await app
      .httpRequest()
      .post('/test?status=400&errors=test')
      .set('Accept', 'text/html')
      .expect('<h2>400 Bad Request</h2>')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(400);
  });

  it('should return 500 html at prod env', async () => {
    mm(app.config, 'env', 'prod');
    mm(app.config.onerror, 'errorPageUrl', '');
    await app
      .httpRequest()
      .post('/test?status=502&errors=test')
      .set('Accept', 'text/html')
      .expect('<h2>Internal Server Error, real status: 502</h2>')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(500);
  });

  it('should return err json at non prod env', async () => {
    await app
      .httpRequest()
      .get('/user.json?status=400&errors=test')
      .set('Accept', 'application/json')
      .expect(/test/)
      .expect({
        errors: 'test',
        message: 'test error',
      })
      .expect(400);
  });

  it('should return parsing json error on html response', async () => {
    await app
      .httpRequest()
      .post('/test?status=400')
      .send({ test: 1 })
      .set('Content-Type', 'application/json')
      .expect(/Problems parsing JSON/)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(400);
  });

  it('should ignore secure config on html response', async () => {
    await app
      .httpRequest()
      .post('/test?status=400')
      .send({ test: 1 })
      .set('Content-Type', 'application/json')
      .expect(/keys: &#39;&lt;String len: 7/)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(400);
  });

  it('should return parsing json error on json response', async () => {
    await app
      .httpRequest()
      .post('/test?status=400')
      .send({ test: 1 })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect({
        message: 'Problems parsing JSON',
      })
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(400);
  });

  it('should redirect to error page', async () => {
    mm(app.config, 'env', 'test');
    await app
      .httpRequest()
      .get('/?status=500')
      .expect('Location', 'https://eggjs.com/500.html?real_status=500')
      .expect(302);
  });

  it('should handle 403 err', async () => {
    mm(app.config, 'env', 'prod');
    await app.httpRequest().get('/?status=403&code=3').expect('<h2>403 Forbidden</h2>').expect(403);
  });

  it('should return jsonp style', async () => {
    mm(app.config, 'env', 'prod');
    await app
      .httpRequest()
      .get('/jsonp?callback=fn')
      .expect('content-type', 'application/javascript; charset=utf-8')
      .expect('/**/ typeof fn === \'function\' && fn({"message":"Internal Server Error"});')
      .expect(500);
  });

  describe('customize', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.consoleLevel('NONE');
      app = mm.app({
        baseDir: getFixtures('onerror-customize'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should support customize json style', async () => {
      mm(app.config, 'env', 'prod');
      await app
        .httpRequest()
        .get('/user.json')
        .expect('content-type', 'application/json; charset=utf-8')
        .expect({ msg: 'error' })
        .expect(500);
    });

    it('should return jsonp style', async () => {
      mm(app.config, 'env', 'prod');
      await app
        .httpRequest()
        .get('/jsonp?callback=fn')
        .expect('content-type', 'application/javascript; charset=utf-8')
        .expect('/**/ typeof fn === \'function\' && fn({"msg":"error"});')
        .expect(500);
    });

    it('should handle html by default', async () => {
      mm(app.config, 'env', 'test');
      await app
        .httpRequest()
        .get('/?status=500')
        .expect('Location', 'https://eggjs.com/500.html?real_status=500')
        .expect(302);
    });
  });

  if (process.platform === 'linux') {
    // ignore Error: write ECONNRESET on windows and macos
    it('should log warn 4xx', async () => {
      fs.rmSync(getFixtures('onerror-4xx/logs'), { force: true, recursive: true });
      const app = mm.app({
        baseDir: getFixtures('onerror-4xx'),
      });
      await app.ready();
      await app
        .httpRequest()
        .post('/body_parser')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          foo: Buffer.alloc(1024 * 1000)
            .fill(1)
            .toString(),
        })
        .expect(/request entity too large/)
        .expect(413);
      await app.close();

      const warnLog = getFixtures('onerror-4xx/logs/onerror-4xx/onerror-4xx-web.log');
      const content = fs.readFileSync(warnLog, 'utf8');
      assert.match(content, /POST \/body_parser] nodejs\..*?Error: request entity too large/);
    });
  }

  describe('no errorpage', () => {
    let app: MockApplication;
    beforeAll(async () => {
      mm.consoleLevel('NONE');
      app = app = mm.app({
        baseDir: getFixtures('onerror-no-errorpage'),
      });
      await app.ready();
    });
    afterAll(() => app.close());

    it('should display 500 Internal Server Error', async () => {
      mm(app.config, 'env', 'prod');
      await app
        .httpRequest()
        .get('/?status=500')
        .expect(500)
        .expect(/Internal Server Error, real status: 500/);
    });
  });

  describe('app.errorpage.url=/500', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.consoleLevel('NONE');
      app = app = mm.app({
        baseDir: getFixtures('onerror-custom-500'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should redirect to error page', async () => {
      mm(app.config, 'env', 'prod');

      await app.httpRequest().get('/mockerror').expect('Location', '/500?real_status=500').expect(302);

      await app.httpRequest().get('/mock4xx').expect('<h2>400 Bad Request</h2>').expect(400);

      await app.httpRequest().get('/500').expect('hi, this custom 500 page').expect(500);

      await app.httpRequest().get('/special').expect('Location', '/specialerror?real_status=500').expect(302);
    });
  });

  describe('onerror.ctx.error env=local', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('local');
      mm.consoleLevel('NONE');
      app = mm.app({
        baseDir: getFixtures('onerror-ctx-error'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should 500 full html', async () => {
      await app
        .httpRequest()
        .get('/error')
        .expect(500)
        .expect(/you can&#x60;t get userId\./);
    });
  });

  describe('onerror.ctx.error env=unittest', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.consoleLevel('NONE');
      app = mm.app({
        baseDir: getFixtures('onerror-ctx-error'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should 500 simple html', async () => {
      await app
        .httpRequest()
        .get('/error')
        .expect(500)
        .expect(/you can`t get userId\./);
    });
  });

  describe('appErrorFilter', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.consoleLevel('NONE');
      app = mm.app({
        baseDir: getFixtures('custom-listener-onerror'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should ignore error log', async () => {
      mm(app.logger, 'log', () => {
        throw new Error('should not excute');
      });

      await app.httpRequest().get('/?name=IgnoreError').expect(500);
    });

    it('should custom log error log', async () => {
      let lastMessage = '';
      mm(app.logger, 'error', (msg: string) => {
        lastMessage = msg;
      });
      await app.httpRequest().get('/?name=CustomError').expect(500);
      assert.equal(lastMessage, 'error happened');
    });

    it('should default log error', async () => {
      let lastError: Error | undefined;
      mm(app.logger, 'log', (_LEVEL: string, args: any[]) => {
        lastError = args[0];
      });

      await app.httpRequest().get('/?name=OtherError').expect(500);
      assert(lastError);
      assert.equal(lastError.name, 'OtherError');
    });
  });

  describe('agent emit error', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.cluster({
        baseDir: getFixtures('agent-error'),
      });
      app.debug();
      return app.ready();
    });
    afterAll(() => app.close());

    it('should log error', async () => {
      // console.log('app.stderr: %s', app.stderr);
      // console.log(app.stdout);
      await app.close();
      assert.match(app.stderr, /TypeError/);
    });
  });

  describe('replace onerror default template', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.consoleLevel('NONE');
      app = mm.app({
        baseDir: getFixtures('onerror-custom-template'),
      });
      return app.ready();
    });

    afterAll(() => app.close());

    afterEach(mm.restore);

    it('should use custom template', async () => {
      mm(app.config, 'env', 'local');
      await app
        .httpRequest()
        .get('/')
        .expect(/custom template/)
        .expect(500);
    });
  });
});
