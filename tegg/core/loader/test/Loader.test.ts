import assert from 'node:assert/strict';
import path from 'node:path';

import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { EggLoadUnitType } from '@eggjs/metadata';
import { afterEach, describe, it } from 'vitest';

import { LoaderFactory, LoaderUtil } from '../src/index.ts';

type BundleModuleGlobalThis = typeof globalThis & {
  __EGG_BUNDLE_MODULE_LOADER__?: (filepath: string) => unknown;
};

describe('core/loader/test/Loader.test.ts', () => {
  afterEach(() => {
    delete (globalThis as BundleModuleGlobalThis).__EGG_BUNDLE_MODULE_LOADER__;
    LoaderUtil.setConfig({});
  });

  describe('module loader', () => {
    it('should load module', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = await loader.load();
      assert.equal(prototypes.length, 4);
      const appRepoProto = prototypes.find((t) => t.name === 'AppRepo');
      const appRepo2Proto = prototypes.find((t) => t.name === 'AppRepo2');
      const sprintRepoProto = prototypes.find((t) => t.name === 'SprintRepo');
      const userRepoProto = prototypes.find((t) => t.name === 'UserRepo');
      assert(appRepoProto);
      assert(appRepo2Proto);
      assert(sprintRepoProto);
      assert(userRepoProto);
    });

    it('should not load test/coverage files', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-with-test');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = await loader.load();
      assert.equal(prototypes.length, 1);
    });

    it('should set extraFilePattern without error', async () => {
      LoaderUtil.setConfig({ extraFilePattern: ['!extra'] });
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-with-extra');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = await loader.load();
      assert.equal(prototypes.length, 1);
    });

    it('should load pre-bundled files through the bundle module loader', async () => {
      class BundledService {}
      SingletonProto()(BundledService);
      const bundledFile = '/bundle/app/port/manager/UserRoleManager.ts';
      (globalThis as BundleModuleGlobalThis).__EGG_BUNDLE_MODULE_LOADER__ = (filepath) => {
        assert.equal(filepath, bundledFile);
        return { BundledService };
      };

      const prototypes = await LoaderUtil.loadFile(bundledFile);

      assert.deepEqual(
        prototypes.map((proto) => proto.name),
        ['BundledService'],
      );
      assert.equal(PrototypeUtil.getFilePath(BundledService), bundledFile);
    });

    it('should fall back to dynamic import when the bundle module loader returns null', async () => {
      const appRepoFile = path.join(__dirname, './fixtures/modules/module-for-loader/AppRepo.ts');
      (globalThis as BundleModuleGlobalThis).__EGG_BUNDLE_MODULE_LOADER__ = () => null;

      const prototypes = await LoaderUtil.loadFile(appRepoFile);

      assert.deepEqual(
        prototypes.map((proto) => proto.name),
        ['AppRepo', 'AppRepo2'],
      );
    });

    it('should wrap bundle module loader errors', async () => {
      const bundledFile = '/bundle/app/service.ts';
      (globalThis as BundleModuleGlobalThis).__EGG_BUNDLE_MODULE_LOADER__ = () => {
        throw 'bundle loader failed';
      };

      await assert.rejects(
        async () => {
          await LoaderUtil.loadFile(bundledFile);
        },
        (err: Error & { cause?: unknown }) => {
          assert.equal(err.message, '[tegg/loader] load /bundle/app/service.ts failed: bundle loader failed');
          assert.equal(err.cause, 'bundle loader failed');
          return true;
        },
      );
    });
  });

  describe('file has tsc error', () => {
    it('should failed', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/loader-failed');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      await assert.rejects(
        async () => {
          const prototypes = await loader.load();
          console.log(prototypes);
        },
        (err: Error) => {
          assert.match(
            err.message,
            /Syntax Error|ERROR: Expected ";" but found "here"|Expected `;` but found `Identifier`/,
          );
          return true;
        },
      );
    });
  });
});
