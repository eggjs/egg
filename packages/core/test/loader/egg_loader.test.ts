import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

import { getPlugins } from '@eggjs/utils';
import { mm } from 'mm';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import { EggLoader, RealLoaderFS } from '../../src/index.js';
import { createApp, getFilepath, type Application } from '../helper.js';

describe('test/loader/egg_loader.test.ts', () => {
  let app: Application;
  beforeAll(() => {
    app = createApp('nothing');
  });

  afterAll(() => app.close());

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

      let ret = await loader.loadFile(getFilepath('load_file/function.js'), 1, 2);
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

  it('should pass loaderFS to loadToApp and loadToContext', async () => {
    class MockLoaderFS extends RealLoaderFS {
      glob(): string[] {
        return ['user.js'];
      }

      stat(): any {
        return {
          isFile: () => true,
        };
      }

      async loadFile(filepath: string): Promise<any> {
        return {
          filepath,
        };
      }
    }

    const baseDir = getFilepath('load_to_app');
    const loaderFS = new MockLoaderFS();
    const app: any = { context: {} };
    const loader = new EggLoader({
      baseDir,
      app,
      logger: console,
      loaderFS,
    } as any);

    await loader.loadToApp('/virtual/app/model', 'model');
    await loader.loadToContext('/virtual/app/service', 'service');

    assert.equal(app.model.user.filepath, path.join('/virtual/app/model', 'user.js'));
    assert.equal(app.context.service.user.filepath, path.join('/virtual/app/service', 'user.js'));
  });

  describe('resolveModule with outDir', () => {
    afterEach(mm.restore);

    it('should resolve from outDir configured in package.json egg.outDir', () => {
      const baseDir = getFilepath('app-outdir-pkg');
      const loader = new EggLoader({
        baseDir,
        app: {},
        logger: console,
      } as any);
      assert.equal(loader.outDir, 'dist');
      // config/config.default does not exist as source, only as compiled output in dist/
      const configPath = path.join(baseDir, 'config', 'config.default');
      const resolved = loader.resolveModule(configPath);
      assert(resolved);
      assert(resolved.endsWith(path.join('dist', 'config', 'config.default.js')));
    });

    it('should resolve from outDir auto-detected from tsconfig.json', () => {
      const baseDir = getFilepath('app-outdir-tsconfig');
      const loader = new EggLoader({
        baseDir,
        app: {},
        logger: console,
      } as any);
      assert.equal(loader.outDir, 'build');
      const configPath = path.join(baseDir, 'config', 'config.default');
      const resolved = loader.resolveModule(configPath);
      assert(resolved);
      assert(resolved.endsWith(path.join('build', 'config', 'config.default.js')));
    });

    it('should prefer package.json egg.outDir over tsconfig.json', () => {
      const baseDir = getFilepath('app-outdir-precedence');
      const loader = new EggLoader({
        baseDir,
        app: {},
        logger: console,
      } as any);
      assert.equal(loader.outDir, 'dist');
      const configPath = path.join(baseDir, 'config', 'config.default');
      const resolved = loader.resolveModule(configPath);
      assert(resolved);
      assert(resolved.endsWith(path.join('dist', 'config', 'config.default.js')));
    });

    it('should not have outDir when neither egg.outDir nor tsconfig.json outDir is set', () => {
      const baseDir = getFilepath('nothing');
      const loader = new EggLoader({
        baseDir,
        app: {},
        logger: console,
      } as any);
      assert.equal(loader.outDir, undefined);
    });

    it('should return undefined when file not found in outDir', () => {
      const baseDir = getFilepath('app-outdir-pkg');
      const loader = new EggLoader({
        baseDir,
        app: {},
        logger: console,
      } as any);
      const nonExistent = path.join(baseDir, 'config', 'non-existent');
      const resolved = loader.resolveModule(nonExistent);
      assert.equal(resolved, undefined);
    });

    it('should not fallback for paths outside baseDir', () => {
      const baseDir = getFilepath('app-outdir-pkg');
      const loader = new EggLoader({
        baseDir,
        app: {},
        logger: console,
      } as any);
      const outsidePath = path.join(getFilepath('nothing'), 'config', 'config.default');
      const resolved = loader.resolveModule(outsidePath);
      assert.equal(resolved, undefined);
    });
  });
});
