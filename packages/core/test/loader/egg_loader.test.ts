import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

import { mm } from 'mm';
import { getPlugins } from '@eggjs/utils';

import { createApp, getFilepath, type Application } from '../helper.js';
import { EggLoader } from '../../src/index.js';

describe('test/loader/egg_loader.test.ts', () => {
  let app: Application;
  before(() => {
    app = createApp('nothing');
  });

  after(() => app.close());

  it('should container FileLoader and ContextLoader', () => {
    assert(app.loader.FileLoader);
    assert(app.loader.ContextLoader);
  });

  describe('loader.getHomedir()', () => {
    afterEach(mm.restore);

    it('should return process.env.HOME', () => {
      if (os.userInfo && os.userInfo().homedir) {
        const userInfo = os.userInfo();
        (userInfo as any).homedir = undefined;
        mm(os, 'userInfo', () => userInfo);
      }
      assert.equal(app.loader.getHomedir(), process.env.HOME);
    });

    it('should return /home/admin when process.env.HOME is not exist', () => {
      mm(process.env, 'HOME', '');
      mm(os, 'userInfo', null);
      mm(os, 'homedir', null);
      assert.equal(app.loader.getHomedir(), '/home/admin');
    });

    it('should return when EGG_HOME exists', () => {
      mm(process.env, 'EGG_HOME', '/path/to/home');
      assert.equal(app.loader.getHomedir(), '/path/to/home');
    });
  });

  describe('new Loader()', () => {
    it('should pass', async () => {
      const loader = new EggLoader({
        baseDir: getFilepath('nothing'),
        app: {},
        logger: console,
      } as any);
      await loader.loadPlugin();
    });

    it.skip('should get plugin with @eggjs/utils', async () => {
      await getPlugins({
        baseDir: getFilepath('nothing'),
        framework: getFilepath('egg-esm'),
      });
    });

    it('should loadFile auto resolve file', async () => {
      const loader = new EggLoader({
        baseDir: getFilepath('nothing'),
        app: {},
        logger: console,
      } as any);

      let ret = await loader.loadFile(
        getFilepath('load_file/function.js'),
        1,
        2
      );
      assert.equal(ret[0], 1);
      assert.equal(ret[1], 2);

      ret = await loader.loadFile(getFilepath('load_file/function'), 1, 2);
      assert.equal(ret[0], 1);
      assert.equal(ret[1], 2);
    });
  });

  it('should be loaded by loadToApp, support symbol property', async () => {
    const baseDir = getFilepath('load_to_app');
    const directory = path.join(baseDir, 'app/model');
    const prop = Symbol('prop');
    const app = {};
    const loader = new EggLoader({
      baseDir,
      app,
      logger: console,
    } as any);
    await loader.loadToApp(directory, prop);
    assert(Reflect.get(app, prop).user);
  });

  it('should be loaded by loadToContext', async () => {
    const baseDir = getFilepath('load_to_app');
    const directory = path.join(baseDir, 'app/service');
    const prop = Symbol('prop');
    const app = { context: {} };
    const loader = new EggLoader({
      baseDir,
      app,
      logger: console,
    } as any);
    await loader.loadToContext(directory, prop);
    assert(Reflect.get(app.context, prop).user);
  });
});
