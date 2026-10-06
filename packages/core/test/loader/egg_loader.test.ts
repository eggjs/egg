import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { getPlugins } from '@eggjs/utils';
import { mm } from 'mm';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import {
  ContextLoader,
  EggLoader,
  FileLoader,
  RealLoaderFS,
  type EggLoaderOptions,
  type LoaderFS,
} from '../../src/index.js';
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

    it('should read app package metadata through loaderFS', async () => {
      const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-loader-package-fs-'));
      const packagePath = path.join(baseDir, 'package.json');
      const loaderFS = new PackageMetadataLoaderFS(packagePath, {
        name: 'manifest-app',
        egg: { outDir: 'bundle-dist' },
      });

      try {
        const loader = new EggLoader({
          env: 'unittest',
          baseDir,
          app: {} as EggLoaderOptions['app'],
          logger: app.logger,
          loaderFS,
        });

        assert.equal(loader.getAppname(), 'manifest-app');
        assert.equal(loader.outDir, 'bundle-dist');
        assert.deepEqual(loaderFS.readJSONCalls, [packagePath]);
        await assert.rejects(fs.access(packagePath), { code: 'ENOENT' });
      } finally {
        await fs.rm(baseDir, { recursive: true, force: true });
      }
    });

    it('should load plugin package metadata through loaderFS loadFile', async () => {
      const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-loader-plugin-package-fs-'));
      const appPackagePath = path.join(baseDir, 'package.json');
      const pluginPath = path.join(baseDir, 'plugins/manifest-plugin');
      const pluginPackagePath = path.join(pluginPath, 'package.json');
      const loaderFS = new PackageMetadataLoaderFS(
        appPackagePath,
        { name: 'manifest-app' },
        {
          [pluginPackagePath]: {
            name: 'manifest-plugin',
            version: '1.2.3',
            eggPlugin: { name: 'manifestPlugin' },
          },
        },
      );

      try {
        await fs.mkdir(pluginPath, { recursive: true });
        const loader = new EggLoader({
          env: 'unittest',
          baseDir,
          app: {} as EggLoaderOptions['app'],
          logger: app.logger,
          loaderFS,
          plugins: {
            manifestPlugin: {
              name: 'manifestPlugin',
              enable: true,
              dependencies: [],
              optionalDependencies: [],
              env: [],
              from: '<egg_loader.test.ts>',
              path: pluginPath,
            },
          },
        });

        await loader.loadPlugin();

        assert.equal(loader.plugins.manifestPlugin.version, '1.2.3');
        assert.deepEqual(loaderFS.loadFileCalls, [pluginPackagePath]);
        await assert.rejects(fs.access(pluginPackagePath), { code: 'ENOENT' });
      } finally {
        await fs.rm(baseDir, { recursive: true, force: true });
      }
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

  it('should pass the current loaderFS to loadToApp and loadToContext', async () => {
    const baseDir = getFilepath('load_to_app');
    const initialLoaderFS = new RealLoaderFS();
    const runtimeLoaderFS = new RealLoaderFS();
    const loaderApp = { context: {} } as EggLoaderOptions['app'];
    const loader = new EggLoader({
      env: 'unittest',
      baseDir,
      app: loaderApp,
      logger: app.logger,
      loaderFS: initialLoaderFS,
    });
    loader.loaderFS = runtimeLoaderFS;
    const passedLoaderFS: LoaderFS[] = [];

    mm(FileLoader.prototype, 'load', async function (this: FileLoader) {
      passedLoaderFS.push(this.options.loaderFS);
      return {};
    });
    mm(ContextLoader.prototype, 'load', async function (this: ContextLoader) {
      passedLoaderFS.push(this.options.loaderFS);
      return {};
    });

    try {
      await loader.loadToApp(path.join(baseDir, 'app/model'), 'model');
      await loader.loadToContext(path.join(baseDir, 'app/service'), 'service');

      assert.equal(loader.loaderFS, runtimeLoaderFS);
      assert.deepEqual(passedLoaderFS, [runtimeLoaderFS, runtimeLoaderFS]);
    } finally {
      mm.restore();
    }
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

class PackageMetadataLoaderFS extends RealLoaderFS {
  readonly readJSONCalls: string[] = [];
  readonly loadFileCalls: string[] = [];
  readonly #packageMetadataByPath: Map<string, Record<string, unknown>>;

  constructor(
    packagePath: string,
    packageMetadata: Record<string, unknown>,
    extraPackageMetadata: Record<string, Record<string, unknown>> = {},
  ) {
    super();
    this.#packageMetadataByPath = new Map([[packagePath, packageMetadata], ...Object.entries(extraPackageMetadata)]);
  }

  exists(filepath: string): boolean {
    if (this.#packageMetadataByPath.has(filepath)) {
      return true;
    }
    return super.exists(filepath);
  }

  readJSON<T = unknown>(filepath: string): T {
    this.readJSONCalls.push(filepath);
    const metadata = this.#packageMetadataByPath.get(filepath);
    if (metadata) {
      return metadata as T;
    }
    return super.readJSON<T>(filepath);
  }

  async loadFile(filepath: string): Promise<unknown> {
    this.loadFileCalls.push(filepath);
    const metadata = this.#packageMetadataByPath.get(filepath);
    if (metadata) {
      return metadata;
    }
    return super.loadFile(filepath);
  }
}
