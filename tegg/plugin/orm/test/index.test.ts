import assert from 'node:assert/strict';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import type { Context } from 'egg';
import Realm from 'leoric';
import { describe, it, afterEach, beforeEach, beforeAll, afterAll } from 'vitest';

import { AppService } from './fixtures/apps/orm-app/modules/orm-module/AppService.ts';
import { CtxService } from './fixtures/apps/orm-app/modules/orm-module/CtxService.ts';
import { App } from './fixtures/apps/orm-app/modules/orm-module/model/App.ts';
import { Pkg } from './fixtures/apps/orm-app/modules/orm-module/model/Pkg.ts';
import { PkgService } from './fixtures/apps/orm-app/modules/orm-module/PkgService.ts';

function getFixtures(name: string) {
  return path.join(import.meta.dirname, 'fixtures', name);
}

describe('plugin/orm/test/orm.test.ts', () => {
  let app: MockApplication;
  let appService: AppService;

  afterEach(async () => {
    await Promise.all([Pkg.truncate(), App.truncate()]);
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/orm-app'),
    });
    await app.ready();
    appService = await app.getEggObject(AppService);
  });

  afterAll(() => {
    return app.close();
  });

  it('bone should work', async () => {
    const appService = await app.getEggObject(AppService);
    const appModel = await appService.createApp({
      name: 'egg',
      desc: 'the framework',
    });
    assert(appModel);
    assert.equal(appModel.name, 'egg');
    assert.equal(appModel.desc, 'the framework');

    const findModel = await appService.findApp('egg');
    assert(findModel);
    assert.equal(findModel.name, 'egg');
    assert.equal(findModel.desc, 'the framework');
  });

  it('hook should work', async () => {
    const pkgService = await app.getEggObject(PkgService);
    const pkgModel = await pkgService.createPkg({
      name: 'egg',
      desc: 'the framework',
    });
    assert(pkgModel);
    assert.equal(pkgModel.name, 'egg_before_create_hook');
    assert.equal(pkgModel.desc, 'the framework');

    const findModel = await pkgService.findPkg('egg_before_create_hook');
    assert(findModel);
    assert.equal(findModel.name, 'egg_before_create_hook');
    assert.equal(findModel.desc, 'the framework');
  });

  it('ctx should inject with Model', async () => {
    const appService = await app.getEggObject(AppService);
    app.mockLog();
    await appService.findApp('egg');
    app.expectLog(/sql: SELECT \* FROM `apps` WHERE `name` = 'egg' LIMIT 1/);
    // Model.ctx should be undefined in Singleton Service
    app.expectLog(/path: undefined/);
  });

  describe('raw query', () => {
    beforeEach(async () => {
      const appModel = await appService.createApp({
        name: 'egg',
        desc: 'the framework',
      });
      assert(appModel);
      assert.equal(appModel.name, 'egg');
      assert.equal(appModel.desc, 'the framework');
    });

    it('query success', async () => {
      const res = await appService.rawQuery('test', 'select * from apps where name = "egg"');
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows[0].name, 'egg');
    });

    it('query success for args', async () => {
      const res = await appService.rawQuery('test', 'select * from apps where name = ?', ['egg']);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows[0].name, 'egg');
    });
  });

  // TODO: apple/banana databases need tables created in prepare.js
  // These tests were previously unreachable (nested inside an it() block)
  describe.skip('multi db', () => {
    it('should work for multi database', async () => {
      const appleClient = await appService.getClient('apple');
      const bananaClient = await appService.getClient('banana');
      assert.equal(appleClient.options.database, 'apple');
      assert.equal(appleClient.options.database, 'apple');
      assert.equal(bananaClient.options.database, 'banana');
      assert.equal(bananaClient.options.database, 'banana');
    });

    it('should throw when invalid database', async () => {
      await assert.rejects(async () => {
        await appService.getClient('orange');
      }, /not found orange datasource/);
    });

    it('should return undefined when get default client', async () => {
      const defaultClient = await appService.getDefaultClient();
      assert.equal(defaultClient, undefined);
    });
  });

  describe('context proto', () => {
    let ctx: Context;
    let ctxService: CtxService;
    beforeEach(async () => {
      ctx = await app.mockModuleContext();
      ctxService = await ctx.getEggObject(CtxService);
    });
    afterEach(async () => {
      await app.destroyModuleContext(ctx);
    });

    it('should work for ContextProto service', async () => {
      const ctxPkg = await ctxService.createCtxPkg({
        name: 'egg',
        desc: 'the framework',
      });
      assert.equal(ctxPkg.name, 'egg_before_create_hook');
    });

    it('should query work', async () => {
      app.mockLog();
      await ctxService.createCtxPkg({
        name: 'egg',
        desc: 'the framework',
      });
      const ctxPkg = await ctxService.findCtxPkg('egg_before_create_hook');
      assert(ctxPkg);
      assert.equal(ctxPkg.name, 'egg_before_create_hook');
      app.expectLog(/sql: SELECT \* FROM `pkgs` WHERE `name` = 'egg_before_create_hook' LIMIT 1 path: \//);
    });

    it('should tracer ctx set', async () => {
      let ctx: Context;
      await app.leoricRegister.ready();
      for (const realm of app.leoricRegister.realmMap.values()) {
        // @ts-expect-error: the library definition is wrong
        realm.driver.logger = new Realm.Logger({
          // eslint-disable-next-line no-loop-func
          logQuery(_: any, __: any, options: { Model: { ctx: any } }) {
            if (options.Model) {
              ctx = options.Model.ctx;
            }
          },
        });
      }
      await ctxService.createCtxPkg({
        name: 'egg',
        desc: 'the framework',
      });

      assert.equal(ctx!.originalUrl, '/');
      assert(ctx!.tracer);
      // @ts-expect-error: no type definition
      assert(ctx!.tracer.traceId);
      // assert.equal(ctx!.tracer.traceId, '1234567890');
    });
  });
});
