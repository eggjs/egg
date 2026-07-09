import assert from 'node:assert/strict';
import path from 'node:path';

import { describe, it, afterEach } from 'vitest';

import { ModuleConfigUtil } from '../src/index.js';

describe('test/ModuleConfig.test.ts', () => {
  describe('load yaml config', () => {
    afterEach(() => {
      ModuleConfigUtil.setConfigNames(undefined);
    });

    it('should work', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/foo-yaml'));
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1' } });
    });

    it('should load env', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(
        path.join(__dirname, './fixtures/modules/dev-module-config'),
        undefined,
        'dev',
      );
      assert.deepStrictEqual(config, {
        mysql: { host: '127.0.0.1', port: 11306 },
      });
    });

    it('should load with configNames', async () => {
      ModuleConfigUtil.setConfigNames(['module.default', 'module.dev']);
      const config = await ModuleConfigUtil.loadModuleConfig(
        path.join(__dirname, './fixtures/modules/dev-module-config'),
      );
      const configSync = ModuleConfigUtil.loadModuleConfigSync(
        path.join(__dirname, './fixtures/modules/dev-module-config'),
      );
      assert.deepStrictEqual(config, {
        mysql: { host: '127.0.0.1', port: 11306 },
      });
      assert.deepStrictEqual(configSync, {
        mysql: { host: '127.0.0.1', port: 11306 },
      });
    });

    // it('should throw error without initialization', async () => {
    //   await assert.rejects(async () => {
    //     await ModuleConfigUtil.loadModuleConfig(path.join(__dirname, './fixtures/modules/dev-module-config'));
    //   }, /should setConfigNames before load module config/);
    //
    //   assert.throws(() => {
    //     ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/dev-module-config'));
    //   }, /should setConfigNames before load module config/);
    // });
  });

  describe('resolve module config tolerant', () => {
    it('should read existing module config', () => {
      const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-module-json');
      const modulePath = path.join(fixturesPath, 'app/module-a');
      const resolved = ModuleConfigUtil.resolveModuleConfigTolerant({
        path: modulePath,
        name: 'moduleA',
      });

      assert.deepStrictEqual(resolved, {
        name: 'moduleA',
        path: modulePath,
        config: {},
      });
    });

    it('should use reference name and empty config when module dir does not exist', () => {
      const baseDir = path.join(__dirname, './fixtures/apps/app-with-module-json');
      const resolved = ModuleConfigUtil.resolveModuleConfigTolerant(
        {
          path: 'external/module-a',
          name: 'externalModule',
        },
        baseDir,
      );

      assert.deepStrictEqual(resolved, {
        name: 'externalModule',
        path: path.resolve(baseDir, 'external/module-a'),
        config: {},
      });
    });
  });

  describe('load module reference', () => {
    describe('module.json not exits', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-no-module-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA', package: 'module-a' },
          { path: path.join(fixturesPath, 'app/module-b'), name: 'moduleB', package: 'module-b' },
          {
            path: path.join(fixturesPath, 'app/module-b/test/fixtures/module-e'),
            name: 'moduleE',
            package: 'module-e',
          },
          {
            path: path.join(fixturesPath, 'node_modules/module-c'),
            name: 'moduleC',
            package: 'module-c',
          },
        ]);
      });

      it('duplicated module', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-no-module-json-duplicated');
        assert.throws(
          () => {
            ModuleConfigUtil.readModuleReference(fixturesPath);
          },
          /duplicate import of module reference/,
          'did not throw with expected message',
        );
      });

      describe('has symlink', () => {
        it('should work', () => {
          const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-symlink');
          const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
          assert.deepStrictEqual(ref, [
            { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA', package: 'module-a' },
          ]);
        });
      });
    });

    describe('module.json exits', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-module-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA', package: 'module-a' },
          { path: path.join(fixturesPath, 'app/module-b'), name: 'moduleB', package: 'module-b' },
        ]);
      });
    });

    describe('module.json has pkg', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-module-pkg-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath, {
          cwd: fixturesPath,
        });
        assert.deepStrictEqual(ref, [
          {
            path: path.join(fixturesPath, 'node_modules/module-a'),
            name: 'moduleA',
            package: 'module-a',
          },
        ]);
      });
    });

    describe('filter module', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-modules');
        const readModuleOptions = {
          cwd: fixturesPath,
          extraFilePattern: ['!**/dist'],
        };
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath, readModuleOptions);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA', package: 'module-a' },
        ]);
      });
    });
  });

  describe('read package dependencies', () => {
    it('should success if package.json not exist', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/foo');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, []);
    });

    it('should success whether dependencies entry has exported package.json', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/packages/d');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, [
        {
          path: path.resolve(__dirname, './fixtures/monorepo/packages/d/node_modules/e'),
          name: 'e',
          package: 'e',
        },
        {
          path: path.resolve(__dirname, './fixtures/monorepo/packages/d/node_modules/f'),
          name: 'f',
          package: 'f',
        },
      ]);
    });

    it('should read dependencies from self node_modules', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/packages/a');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, [
        {
          path: path.resolve(__dirname, './fixtures/monorepo/packages/a/node_modules/c'),
          name: 'c',
          package: 'c',
        },
      ]);
    });

    it('should read dependencies from parent node_modules', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/packages/b');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, [
        {
          path: path.resolve(__dirname, './fixtures/monorepo/packages/a'),
          name: 'a',
          package: 'b',
        },
      ]);
    });
  });
});
