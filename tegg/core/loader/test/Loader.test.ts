import assert from 'node:assert/strict';
import path from 'node:path';

import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { EggLoadUnitType } from '@eggjs/metadata';
import type {} from '@eggjs/typings/global';
import { afterEach, describe, it } from 'vitest';

import { LoaderFactory, LoaderUtil } from '../src/index.ts';

describe('core/loader/test/Loader.test.ts', () => {
  afterEach(() => {
    globalThis.__EGG_BUNDLE_MODULE_LOADER__ = undefined;
    globalThis.__EGG_MODULE_IMPORTER__ = undefined;
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
      globalThis.__EGG_BUNDLE_MODULE_LOADER__ = (filepath: string) => {
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
      globalThis.__EGG_BUNDLE_MODULE_LOADER__ = () => null;

      const prototypes = await LoaderUtil.loadFile(appRepoFile);

      assert.deepEqual(
        prototypes.map((proto) => proto.name),
        ['AppRepo', 'AppRepo2'],
      );
    });

    it('should wrap bundle module loader errors', async () => {
      const bundledFile = '/bundle/app/service.ts';
      globalThis.__EGG_BUNDLE_MODULE_LOADER__ = () => {
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

    it('should load through the async module importer when set', async () => {
      class ImportedService {}
      SingletonProto()(ImportedService);
      const importedFile = '/imported/app/manager/ImportedService.ts';
      let importerArg: string | undefined;
      globalThis.__EGG_MODULE_IMPORTER__ = async (filePath: string) => {
        importerArg = filePath;
        return { ImportedService };
      };

      const prototypes = await LoaderUtil.loadFile(importedFile);

      assert.equal(importerArg, importedFile);
      assert.deepEqual(
        prototypes.map((proto) => proto.name),
        ['ImportedService'],
      );
      assert.equal(PrototypeUtil.getFilePath(ImportedService), importedFile);
    });

    it('should fall back to dynamic import when the module importer returns null', async () => {
      const appRepoFile = path.join(__dirname, './fixtures/modules/module-for-loader/AppRepo.ts');
      globalThis.__EGG_MODULE_IMPORTER__ = async () => null;

      const prototypes = await LoaderUtil.loadFile(appRepoFile);

      assert.deepEqual(
        prototypes.map((proto) => proto.name),
        ['AppRepo', 'AppRepo2'],
      );
    });

    it('should wrap module importer errors', async () => {
      const importedFile = '/imported/app/service.ts';
      globalThis.__EGG_MODULE_IMPORTER__ = async () => {
        throw 'importer failed';
      };

      await assert.rejects(
        async () => {
          await LoaderUtil.loadFile(importedFile);
        },
        (err: Error & { cause?: unknown }) => {
          assert.equal(err.message, '[tegg/loader] load /imported/app/service.ts failed: importer failed');
          assert.equal(err.cause, 'importer failed');
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
