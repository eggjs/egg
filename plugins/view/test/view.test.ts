import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import coffee from 'coffee';
import { mm, MockApplication, mock } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtures = path.join(__dirname, 'fixtures');

describe('test/view.test.ts', () => {
  afterEach(mm.restore);

  describe('multiple view engine', () => {
    const baseDir = path.join(fixtures, 'apps/multiple-view-engine');
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/multiple-view-engine',
      });
      return app.ready();
    });
    after(() => app.close());

    describe('use', () => {
      it('should throw when name do not exist', () => {
        assert.throws(() => {
          (app.view as any).use();
        }, /name is required/);
      });

      it('should throw when viewEngine do not exist', () => {
        assert.throws(() => {
          (app.view as any).use('a');
        }, /viewEngine is required/);
      });

      it('should throw when name has been registered', () => {
        class View {
          render(): Promise<string> {
            return Promise.resolve('');
          }
          renderString(): Promise<string> {
            return Promise.resolve('');
          }
        }
        app.view.use('b', View);
        assert.throws(() => {
          app.view.use('b', View);
        }, /b has been registered/);
      });

      it('should throw when not implement render', () => {
        class View {}
        assert.throws(() => {
          app.view.use('c', View as any);
        }, /viewEngine should implement `render` method/);
      });

      it('should throw when not implement render', () => {
        class View {
          render() {}
        }
        assert.throws(() => {
          app.view.use('d', View as any);
        }, /viewEngine should implement `renderString` method/);
      });

      it('should not support render generator function', () => {
        class View {
          *render() {
            yield 'a';
          }
          *renderString() {
            yield 'a';
          }
        }
        assert.throws(() => {
          app.view.use('d', View as any);
        }, /viewEngine `render` method should not be generator function/);
      });

      it('should not support renderString generator function', () => {
        class View {
          render() {}
          *renderString() {
            yield 'a';
          }
        }
        assert.throws(() => {
          app.view.use('d', View as any);
        }, /viewEngine `renderString` method should not be generator function/);
      });

      it('should register success', () => {
        class View {
          render() {}
          renderString() {}
        }
        app.view.use('e', View as any);
        assert.equal(app.view.get('e'), View);
      });
    });

    describe('render', () => {
      it('should render ejs', async () => {
        const res = await app.httpRequest().get('/render-ejs').expect(200);

        assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.ejs'));
        assert(res.body.locals.data === 1);
        assert(res.body.options.opt === 1);
        assert(res.body.type === 'ejs');
        const ctx = app.mockContext();
        assert.equal(typeof ctx.render, 'function');
        assert.equal(typeof ctx.renderString, 'function');
        assert.equal(typeof ctx.renderView, 'function');
        assert.equal(typeof ctx.view.render, 'function');
      });

      it('should render nunjucks', async () => {
        const res = await app.httpRequest().get('/render-nunjucks').expect(200);

        assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.nj'));
        assert(res.body.locals.data === 1);
        assert(res.body.options.opt === 1);
        assert(res.body.type === 'nunjucks');
      });

      it('should render with options.viewEngine', async () => {
        const res = await app.httpRequest().get('/render-with-options').expect(200);

        assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.nj'));
        assert(res.body.type === 'ejs');
      });
    });

    describe('renderString', () => {
      it('should renderString', async () => {
        const res = await app.httpRequest().get('/render-string').expect(200);
        assert(res.body.tpl === 'hello world');
        assert(res.body.locals.data === 1);
        assert(res.body.options.viewEngine === 'ejs');
        assert(res.body.type === 'ejs');
      });

      it('should throw when no viewEngine', async () => {
        await app.httpRequest().get('/render-string-without-view-engine').expect(500);
      });

      it('should renderString twice', async () => {
        await app.httpRequest().get('/render-string-twice').expect('a,b').expect(200);
      });
    });

    describe('locals', () => {
      it('should render with locals', async () => {
        const res = await app.httpRequest().get('/render-locals').expect(200);
        const locals = res.body.locals;
        assert(locals.a === 1);
        assert(locals.b === 2);
        assert(locals.ctx);
        assert(locals.request);
        assert(locals.helper);
      });

      it('should renderString with locals', async () => {
        const res = await app.httpRequest().get('/render-string-locals').expect(200);
        const locals = res.body.locals;
        assert(locals.a === 1);
        assert(locals.b === 2);
        assert(locals.ctx);
        assert(locals.request);
        assert(locals.helper);
      });

      it('should render with original locals', async () => {
        const res = await app.httpRequest().get('/render-original-locals').expect(200);
        const locals = res.body.originalLocals;
        assert(!locals.a);
        assert(locals.b === 2);
        assert(!locals.ctx);
        assert(!locals.request);
        assert(!locals.helper);
      });
    });

    describe('resolve', () => {
      it('should loader without extension', async () => {
        const res = await app.httpRequest().get('/render-without-ext').expect(200);
        assert(res.body.filename === path.join(baseDir, 'app/view/loader/a.ejs'));
      });

      it('should throw when render file that extension is not configured', async () => {
        await app
          .httpRequest()
          .get('/render-ext-without-config')
          .expect(500)
          .expect(/Can't find viewEngine for /);
      });

      it('should throw when render file without viewEngine', async () => {
        await app
          .httpRequest()
          .get('/render-without-view-engine')
          .expect(500)
          .expect(/Can't find ViewEngine "html"/);
      });

      it('should load file from multiple root', async () => {
        const res = await app.httpRequest().get('/render-multiple-root').expect(200);
        assert(res.body.filename === path.join(baseDir, 'app/view2/loader/from-view2.ejs'));
      });

      it('should load file from multiple root when without extension', async () => {
        const res = await app.httpRequest().get('/render-multiple-root-without-extenstion').expect(200);
        assert(res.body.filename === path.join(baseDir, 'app/view2/loader/from-view2.ejs'));
      });

      it('should render load "name" before "name + defaultExtension" in multiple root', async () => {
        const res = await app.httpRequest().get('/load-same-file').expect(200);
        assert(res.body.filename === path.join(baseDir, 'app/view2/loader/a.nj'));
      });

      it('should load file that do not exist', async () => {
        await app
          .httpRequest()
          .get('/load-file-noexist')
          .expect(/Can't find noexist.ejs from/)
          .expect(500);
      });
    });
  });

  describe('check root', () => {
    let app: MockApplication;
    before(() => {
      app = mock.app({
        baseDir: 'apps/check-root',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should check root config first', () => {
      assert(app.view.config.root.length === 0);
    });
  });

  describe('async function', () => {
    const baseDir = path.join(fixtures, 'apps/multiple-view-engine');
    let app: MockApplication;
    before(() => {
      app = mock.app({
        baseDir: 'apps/multiple-view-engine',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should render', async () => {
      const res = await app.httpRequest().get('/render-async').expect(200);

      assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.async'));
      assert(res.body.type === 'async');
    });

    it('should renderString', async () => {
      const res = await app.httpRequest().get('/render-string-async').expect(200);

      assert(res.body.tpl === 'async function');
      assert(res.body.type === 'async');
    });
  });

  describe('defaultViewEngine', () => {
    let app: MockApplication;
    before(() => {
      app = mock.app({
        baseDir: 'apps/default-view-engine',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should render without viewEngine', async () => {
      await app.httpRequest().get('/render').expect('ejs').expect(200);
    });

    it('should renderString without viewEngine', async () => {
      await app.httpRequest().get('/render-string').expect('ejs').expect(200);
    });
  });

  describe('cache enable', () => {
    let app: MockApplication;
    const viewPath = path.join(__dirname, 'fixtures/apps/cache/app/view1/home.nj');
    before(() => {
      app = mock.app({
        baseDir: 'apps/cache',
      });
      return app.ready();
    });
    after(() => app.close());
    after(() => fs.writeFile(viewPath, 'a\n'));

    it('should cache', async () => {
      let res = await app.httpRequest().get('/');
      assert(res.text === viewPath);

      await fs.unlink(viewPath);
      res = await app.httpRequest().get('/');
      assert(res.text === viewPath);
    });
  });

  describe('cache disable', () => {
    let app: MockApplication;
    const viewPath1 = path.join(__dirname, 'fixtures/apps/cache/app/view1/home.nj');
    const viewPath2 = path.join(__dirname, 'fixtures/apps/cache/app/view2/home.nj');
    before(() => {
      mock.env('local');
      app = mock.app({
        baseDir: 'apps/cache',
      });
      return app.ready();
    });
    after(() => app.close());
    after(() => fs.writeFile(viewPath1, ''));

    it('should cache', async () => {
      let res = await app.httpRequest().get('/');
      assert(res.text === viewPath1);

      await fs.unlink(viewPath1);
      res = await app.httpRequest().get('/');
      assert(res.text === viewPath2);
    });
  });

  describe('options.root', () => {
    let app: MockApplication;
    const baseDir = path.join(fixtures, 'apps/options-root');
    before(() => {
      app = mock.app({
        baseDir: 'apps/options-root',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should return name and root', async () => {
      let res = await app.httpRequest().get('/');

      assert.deepEqual(res.body, {
        fullpath: path.join(baseDir, 'app/view/sub/a.html'),
        root: path.join(baseDir, 'app/view'),
        name: 'sub/a.html',
      });

      res = await app.httpRequest().get('/absolute');

      assert.deepEqual(res.body, {
        fullpath: path.join(baseDir, 'app/view/sub/a.html'),
        root: path.join(baseDir, 'app/view'),
        name: '/sub/a.html',
      });
    });
  });

  describe('out of view path', () => {
    let app: MockApplication;
    before(() => {
      app = mock.app({
        baseDir: 'apps/out-of-path',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should 500 when filename out of path', async () => {
      await app
        .httpRequest()
        .get('/render')
        .expect(500)
        .expect(/Can't find \.\.\/a\.html/);
    });
  });

  describe.skip('typescript', () => {
    it('should compile ts without error', () => {
      return coffee
        .fork(require.resolve('typescript/bin/tsc'), [
          '-p',
          path.resolve(__dirname, './fixtures/apps/ts/tsconfig.json'),
        ])
        .debug()
        .expect('code', 0)
        .end();
    });
  });
});
