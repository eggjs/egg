import assert from 'node:assert/strict';
import path from 'node:path';
// import { scheduler } from 'node:timers/promises';

import { ModuleDescriptorDumper } from '@eggjs/metadata';
import { mm } from '@eggjs/mock';
import { LoaderFactory, TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import { describe, it, afterEach, vi } from 'vitest';

import { EggModuleLoader } from '../../src/lib/EggModuleLoader.js';
import { getAppBaseDir } from '../utils.ts';

describe('test/lib/EggModuleLoader.test.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    return mm.restore();
  });

  describe('has recursive dependency module', () => {
    it('should throw error', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('recursive-module-app'),
      });
      await assert.rejects(async () => {
        // await scheduler.wait(1000);
        await app.ready();
      }, /module has recursive deps/);
      await app.close();
    });
  });

  describe('module config in wrong order', () => {
    it('should load module success', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('wrong-order-app'),
      });
      await app.ready();
      await app.close();
    });
  });

  describe('bundled manifest metadata', () => {
    it('should restore manifest descriptor paths before loading modules', async () => {
      const repoModulePath = path.join(__dirname, '../../../../core/loader/test/fixtures/modules/module-for-loader');
      const baseDir = path.dirname(repoModulePath);
      const bundledModulePath = path.relative(baseDir, repoModulePath);
      const teggManifest: TeggManifestExtension = {
        moduleReferences: [{ name: 'module-for-loader', path: bundledModulePath }],
        moduleDescriptors: [
          {
            name: 'module-for-loader',
            unitPath: bundledModulePath,
            decoratedFiles: [],
          },
        ],
      };
      const loadApp = vi.spyOn(LoaderFactory, 'loadApp').mockResolvedValue([
        {
          name: 'module-for-loader',
          unitPath: repoModulePath,
          clazzList: [],
          multiInstanceClazzList: [],
          protos: [],
        },
      ]);
      vi.spyOn(ModuleDescriptorDumper, 'dump').mockResolvedValue();
      const app = {
        baseDir,
        moduleReferences: [{ name: 'module-for-loader', path: repoModulePath }],
        plugins: {},
        loader: {
          manifest: {
            getExtension(key: string) {
              return key === TEGG_MANIFEST_KEY ? teggManifest : undefined;
            },
          },
        },
        logger: {
          warn() {},
        },
      };

      const loader = new EggModuleLoader(app as any);
      await (loader as any).buildAppGraph();

      assert.notEqual(teggManifest.moduleDescriptors[0].unitPath, repoModulePath);
      assert.equal(loadApp.mock.calls.length, 1);
      assert.equal(loadApp.mock.calls[0][0][0].path, repoModulePath);
      assert.equal(loadApp.mock.calls[0][1]?.moduleDescriptors[0].unitPath, repoModulePath);
    });
  });
});
