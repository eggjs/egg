import path from 'node:path';
import fs from 'node:fs/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';

function getFixtures(name: string) {
  return path.join(import.meta.dirname, 'fixtures', name);
}

describe('test/view.test.ts', () => {
  afterEach(mm.restore);

  describe('multiple view engine', () => {
    const baseDir = getFixtures('apps/multiple-view-engine');
    let app: MockApplication;
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/multiple-view-engine'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    describe('use', () => {
      it('should throw when name do not exist', () => {
        expect(() => {
          (app.view as any).use();
        }).toThrow(/name is required/);
      });

      it('should throw when viewEngine do not exist', () => {
        expect(() => {
          (app.view as any).use('a');
        }).toThrow(/viewEngine is required/);
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
        expect(() => {
          app.view.use('b', View);
        }).toThrow(/b has been registered/);
      });

      it('should throw when not implement render', () => {
        class View {}
        expect(() => {
          app.view.use('c', View as any);
        }).toThrow(/viewEngine should implement `render` method/);
      });

      it('should throw when not implement render', () => {
        class View {
          render() {}
        }
        expect(() => {
          app.view.use('d', View as any);
        }).toThrow(/viewEngine should implement `renderString` method/);
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
        expect(() => {
          app.view.use('d', View as any);
        }).toThrow(/viewEngine `render` method should not be generator function/);
      });

      it('should not support renderString generator function', () => {
        class View {
          render() {}
          *renderString() {
            yield 'a';
          }
        }
        expect(() => {
          app.view.use('d', View as any);
        }).toThrow(/viewEngine `renderString` method should not be generator function/);
      });

      it('should register success', () => {
        class View {
          render() {}
          renderString() {}
        }
        app.view.use('e', View as any);
        expect(app.view.get('e')).toBe(View);
      });
    });

    describe('render', () => {
      it('should render ejs', async () => {
        const res = await app.httpRequest().get('/render-ejs').expect(200);

        expect(res.body.filename).toBe(path.join(baseDir, 'app/view/ext/a.ejs'));
        expect(res.body.locals.data).toBe(1);
        expect(res.body.options.opt).toBe(1);
        expect(res.body.type).toBe('ejs');
        const ctx = app.mockContext();
        expect(typeof ctx.render).toBe('function');
        expect(typeof ctx.renderString).toBe('function');
        expect(typeof ctx.renderView).toBe('function');
        expect(typeof ctx.view.render).toBe('function');
      });

      it('should render nunjucks', async () => {
        const res = await app.httpRequest().get('/render-nunjucks').expect(200);

        expect(res.body.filename).toBe(path.join(baseDir, 'app/view/ext/a.nj'));
        expect(res.body.locals.data).toBe(1);
        expect(res.body.options.opt).toBe(1);
        expect(res.body.type).toBe('nunjucks');
      });

      it('should render with options.viewEngine', async () => {
        const res = await app.httpRequest().get('/render-with-options').expect(200);

        expect(res.body.filename).toBe(path.join(baseDir, 'app/view/ext/a.nj'));
        expect(res.body.type).toBe('ejs');
      });
    });

    describe('renderString', () => {
      it('should renderString', async () => {
        const res = await app.httpRequest().get('/render-string').expect(200);
        expect(res.body.tpl).toBe('hello world');
        expect(res.body.locals.data).toBe(1);
        expect(res.body.options.viewEngine).toBe('ejs');
        expect(res.body.type).toBe('ejs');
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
        expect(locals.a).toBe(1);
        expect(locals.b).toBe(2);
        expect(locals.ctx);
        expect(locals.request);
        expect(locals.helper);
      });

      it('should renderString with locals', async () => {
        const res = await app.httpRequest().get('/render-string-locals').expect(200);
        const locals = res.body.locals;
        expect(locals.a).toBe(1);
        expect(locals.b).toBe(2);
        expect(locals.ctx);
        expect(locals.request);
        expect(locals.helper).toBeDefined();
      });

      it('should render with original locals', async () => {
        const res = await app.httpRequest().get('/render-original-locals').expect(200);
        const locals = res.body.originalLocals;
        expect(!locals.a);
        expect(locals.b).toBe(2);
        expect(!locals.ctx);
        expect(!locals.request);
        expect(!locals.helper);
      });
    });

    describe('resolve', () => {
      it('should loader without extension', async () => {
        const res = await app.httpRequest().get('/render-without-ext').expect(200);
        expect(res.body.filename).toBe(path.join(baseDir, 'app/view/loader/a.ejs'));
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
        expect(res.body.filename).toBe(path.join(baseDir, 'app/view2/loader/from-view2.ejs'));
      });

      it('should load file from multiple root when without extension', async () => {
        const res = await app.httpRequest().get('/render-multiple-root-without-extenstion').expect(200);
        expect(res.body.filename).toBe(path.join(baseDir, 'app/view2/loader/from-view2.ejs'));
      });

      it('should render load "name" before "name + defaultExtension" in multiple root', async () => {
        const res = await app.httpRequest().get('/load-same-file').expect(200);
        expect(res.body.filename).toBe(path.join(baseDir, 'app/view2/loader/a.nj'));
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
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/check-root'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should check root config first', () => {
      expect(app.view.config.root.length).toBe(0);
    });
  });

  describe('async function', () => {
    const baseDir = getFixtures('apps/multiple-view-engine');
    let app: MockApplication;
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/multiple-view-engine'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should render', async () => {
      const res = await app.httpRequest().get('/render-async').expect(200);

      expect(res.body.filename).toBe(path.join(baseDir, 'app/view/ext/a.async'));
      expect(res.body.type).toBe('async');
    });

    it('should renderString', async () => {
      const res = await app.httpRequest().get('/render-string-async').expect(200);

      expect(res.body.tpl).toBe('async function');
      expect(res.body.type).toBe('async');
    });
  });

  describe('defaultViewEngine', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/default-view-engine'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should render without viewEngine', async () => {
      await app.httpRequest().get('/render').expect('ejs').expect(200);
    });

    it('should renderString without viewEngine', async () => {
      await app.httpRequest().get('/render-string').expect('ejs').expect(200);
    });
  });

  describe('cache enable', () => {
    let app: MockApplication;
    const viewPath = getFixtures('apps/cache/app/view1/home.nj');
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/cache'),
      });
      return app.ready();
    });
    afterAll(() => app.close());
    afterAll(() => fs.writeFile(viewPath, 'a\n'));

    it('should cache', async () => {
      let res = await app.httpRequest().get('/');
      expect(res.text).toBe(viewPath);

      await fs.unlink(viewPath);
      res = await app.httpRequest().get('/');
      expect(res.text).toBe(viewPath);
    });
  });

  describe('cache disable', () => {
    let app: MockApplication;
    const viewPath1 = getFixtures('apps/cache/app/view1/home.nj');
    const viewPath2 = getFixtures('apps/cache/app/view2/home.nj');
    beforeAll(() => {
      mm.env('local');
      app = mm.app({
        baseDir: getFixtures('apps/cache'),
      });
      return app.ready();
    });
    afterAll(() => app.close());
    afterAll(() => fs.writeFile(viewPath1, ''));

    it('should cache', async () => {
      let res = await app.httpRequest().get('/');
      expect(res.text).toBe(viewPath1);

      await fs.unlink(viewPath1);
      res = await app.httpRequest().get('/');
      expect(res.text).toBe(viewPath2);
    });
  });

  describe('options.root', () => {
    let app: MockApplication;
    const baseDir = getFixtures('apps/options-root');
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/options-root'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should return name and root', async () => {
      let res = await app.httpRequest().get('/');

      expect(res.body).toEqual({
        fullpath: path.join(baseDir, 'app/view/sub/a.html'),
        root: path.join(baseDir, 'app/view'),
        name: 'sub/a.html',
      });

      res = await app.httpRequest().get('/absolute');

      expect(res.body).toEqual({
        fullpath: path.join(baseDir, 'app/view/sub/a.html'),
        root: path.join(baseDir, 'app/view'),
        name: '/sub/a.html',
      });
    });
  });

  describe('out of view path', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('apps/out-of-path'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should 500 when filename out of path', async () => {
      await app
        .httpRequest()
        .get('/render')
        .expect(500)
        .expect(/Can't find \.\.\/a\.html/);
    });
  });
});
