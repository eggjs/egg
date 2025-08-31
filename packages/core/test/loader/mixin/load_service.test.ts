import path from 'node:path';
import assert from 'node:assert/strict';

import { request } from '@eggjs/supertest';
import { mm } from 'mm';

import { createApp, getFilepath, type Application } from '../../helper.js';

describe('test/loader/mixin/load_service.test.ts', () => {
  let app: Application;
  afterEach(mm.restore);
  afterEach(() => app.close());

  it('should load from application and plugin', async () => {
    app = createApp('plugin');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadApplicationExtend();
    await app.loader.loadCustomApp();
    await app.loader.loadService();
    await app.loader.loadController();
    await app.loader.loadRouter();
    await app.loader.loadMiddleware();
    await app.ready();
    console.log(app.serviceClasses);
    assert(app.serviceClasses.foo);
    assert(app.serviceClasses.foo2);
    assert(!app.serviceClasses.bar1);
    assert(app.serviceClasses.bar2);
    assert(app.serviceClasses.foo4);

    await request(app.callback())
      .get('/')
      .expect({
        foo2: 'foo2',
        foo3: 'foo3',
        foo4: true,
        foo5: true,
        foo: true,
        bar2: true,
      })
      .expect(200);
  });

  it('should throw when dulplicate', async () => {
    await assert.rejects(async () => {
      app = createApp('service-override');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadService();
    }, /can't overwrite property 'foo'/);
  });

  it('should check es6', async () => {
    app = createApp('services_loader_verify');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadApplicationExtend();
    await app.loader.loadService();
    assert('foo' in app.serviceClasses);
    assert('bar' in app.serviceClasses.foo);
    assert('bar1' in app.serviceClasses.foo);
    assert('aa' in app.serviceClasses.foo);
  });

  it('should each request has unique ctx', async () => {
    app = createApp('service-unique');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadApplicationExtend();
    await app.loader.loadCustomApp();
    await app.loader.loadService();
    await app.loader.loadController();
    await app.loader.loadRouter();
    await app.loader.loadMiddleware();

    await request(app.callback()).get('/same?t=1').expect('true').expect(200);

    await request(app.callback()).get('/same?t=2').expect('true').expect(200);
  });

  it('should extend app.Service', async () => {
    app = createApp('extends-app-service');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadApplicationExtend();
    await app.loader.loadCustomApp();
    await app.loader.loadService();
    await app.loader.loadController();
    await app.loader.loadRouter();
    await app.loader.loadMiddleware();

    const res = await request(app.callback()).get('/user').expect(200);
    assert.equal(res.body.user, '123mock');
  });

  describe('subdir', () => {
    it('should load 2 level dir', async () => {
      mm(process.env, 'NO_DEPRECATION', '*');
      app = createApp('subdir-services');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadApplicationExtend();
      await app.loader.loadCustomApp();
      await app.loader.loadService();
      await app.loader.loadController();
      await app.loader.loadRouter();
      await app.loader.loadMiddleware();

      await request(app.callback())
        .get('/')
        .expect({
          user: {
            uid: '123',
          },
          cif: {
            uid: '123cif',
            cif: true,
          },
          bar1: {
            name: 'bar1name',
            bar: 'bar1',
          },
          bar2: {
            name: 'bar2name',
            bar: 'bar2',
          },
          'foo.subdir2.sub2': {
            name: 'bar3name',
            bar: 'bar3',
          },
          subdir11bar: {
            bar: 'bar111',
          },
          ok: {
            ok: true,
          },
          cmd: {
            cmd: 'hihi',
            method: 'GET',
            url: '/',
          },
          serviceIsSame: true,
          oldStyle: '/',
        })
        .expect(200);
    });
  });

  describe('service in other directory', () => {
    before(async () => {
      const baseDir = getFilepath('other-directory');
      app = createApp('other-directory');
      await app.loader.loadCustomApp();
      await app.loader.loadService({
        directory: path.join(baseDir, 'app/other-service'),
      });
      return app.ready();
    });

    it('should load', () => {
      console.log(app.serviceClasses);
      assert(app.serviceClasses.user);
    });
  });
});
