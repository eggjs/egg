import assert from 'node:assert/strict';
import path from 'node:path';

import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { RealLoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import { EggLoadUnitType } from '@eggjs/metadata';
import type {} from '@eggjs/typings/global';
import { importModule } from '@eggjs/utils';
import { afterEach, describe, it } from 'vitest';

import { LoaderFactory, LoaderUtil } from '../src/index.ts';

class RecordingLoaderFS extends RealLoaderFS {
  readonly globCalls: Array<{ patterns: string | string[]; cwd: string | undefined }> = [];
  readonly loadFileCalls: string[] = [];

  override glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    this.globCalls.push({ patterns, cwd: options?.cwd ? String(options.cwd) : undefined });
    return super.glob(patterns, options);
  }

  override async loadFile(filepath: string): Promise<unknown> {
    this.loadFileCalls.push(filepath);
    return await importModule(filepath);
  }
}

describe('core/loader/test/Loader.test.ts', () => {
  afterEach(() => {
    globalThis.__EGG_BUNDLE_MODULE_LOADER__ = undefined;
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

    it('should use configured LoaderFS for file discovery and loading', async () => {
      const loaderFS = new RecordingLoaderFS();
      LoaderUtil.setConfig({ loaderFS });
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);

      const prototypes = await loader.load();

      assert.equal(prototypes.length, 4);
      assert.equal(loaderFS.globCalls.length, 1);
      assert.equal(loaderFS.globCalls[0].cwd, repoModulePath);
      assert(loaderFS.loadFileCalls.some((file) => file.endsWith('AppRepo.ts')));
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

    it('should load a direct class export from the bundle module loader', async () => {
      class DirectBundledService {}
      SingletonProto()(DirectBundledService);
      const bundledFile = '/bundle/app/service.ts';
      globalThis.__EGG_BUNDLE_MODULE_LOADER__ = () => DirectBundledService;

      const prototypes = await LoaderUtil.loadFile(bundledFile);

      assert.deepEqual(
        prototypes.map((proto) => proto.name),
        ['DirectBundledService'],
      );
    });

    it('should ignore non-egg classes from loaded modules', async () => {
      class PlainClass {}
      const bundledFile = '/bundle/app/plain.ts';
      globalThis.__EGG_BUNDLE_MODULE_LOADER__ = () => ({ PlainClass });

      const prototypes = await LoaderUtil.loadFile(bundledFile);

      assert.deepEqual(prototypes, []);
    });

    it('should load regular files when no bundle module loader is registered', async () => {
      const appRepoFile = path.join(__dirname, './fixtures/modules/module-for-loader/AppRepo.ts');

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
