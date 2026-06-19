import assert from 'node:assert/strict';
import path from 'node:path';

import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { RealLoaderFS, type LoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import {
  EggLoadUnitType,
  EggPrototypeFactory,
  GlobalGraph,
  GlobalModuleNodeBuilder,
  LoadUnitFactory,
} from '@eggjs/metadata';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { ModuleLoader } from '@eggjs/tegg-loader';
import { type LoadUnitInstance } from '@eggjs/tegg-types';
import { describe, beforeAll, afterAll, it } from 'vitest';

import { EggContainerFactory, LoadUnitInstanceFactory } from '../src/index.ts';
import { ContextHandler } from '../src/model/ContextHandler.ts';
import { EggContextStorage } from './fixtures/EggContextStorage.ts';
import { EggTestContext } from './fixtures/EggTestContext.ts';
import AppService from './fixtures/modules/multi-module/multi-module-service/AppService.ts';

/**
 * Theme G (attempt) — bundled cross-module DI regression.
 *
 * Drives the same multi-module fixtures as LoadUnitInstance.test.ts, but loads
 * every module through the manifest path (precomputed `decoratedFiles`) instead
 * of globby discovery. A LoaderFS whose `glob` throws guarantees the whole chain
 * never falls back to a real filesystem scan, mirroring how a bundled app loads
 * from a manifest-backed VFS. Verifies that cross-module dependency injection
 * (service -> public repo -> private persistence) still resolves end to end.
 */
describe('test/BundledDI.test.ts', () => {
  const fixturesRoot = path.join(__dirname, 'fixtures/modules/multi-module');

  // The "manifest": files that contain decorated classes, relative to each module.
  const manifest: Array<{ dir: string; decoratedFiles: string[] }> = [
    { dir: 'multi-module-common', decoratedFiles: [] },
    { dir: 'multi-module-repo', decoratedFiles: ['AppRepo.ts', 'PersistenceService.ts'] },
    { dir: 'multi-module-service', decoratedFiles: ['AppService.ts'] },
  ];

  // A LoaderFS that serves everything from the real fs EXCEPT discovery: any
  // glob call means we fell off the manifest path, which must not happen.
  class NoGlobLoaderFS extends RealLoaderFS implements LoaderFS {
    glob(_patterns: string | string[], _options?: LoaderFSGlobOptions): string[] {
      throw new Error('discovery must come from the manifest, glob should never be called');
    }
  }
  const loaderFS = new NoGlobLoaderFS();

  const loadUnitInstances: LoadUnitInstance[] = [];

  async function loadModuleProtos(absPath: string, decoratedFiles: string[]): Promise<EggProtoImplClass[]> {
    return new ModuleLoader(absPath, { precomputedFiles: decoratedFiles, loaderFS }).load();
  }

  beforeAll(async () => {
    EggContextStorage.register();

    const absModules = manifest.map((m) => ({ ...m, absPath: path.join(fixturesRoot, m.dir) }));

    // Build the global module graph from manifest-discovered protos.
    GlobalGraph.instance = new GlobalGraph();
    for (const { absPath, decoratedFiles } of absModules) {
      const clazzList = await loadModuleProtos(absPath, decoratedFiles);
      const eggProtoClass = clazzList.filter((clazz) => PrototypeUtil.isEggPrototype(clazz));
      const builder = GlobalModuleNodeBuilder.create(absPath, false);
      for (const clazz of eggProtoClass) {
        builder.addClazz(clazz);
      }
      GlobalGraph.instance.addModuleNode(builder.build());
    }
    // build()/sort() validate cross-module dependency resolution; they throw if
    // AppService cannot reach AppRepo across the module boundary.
    GlobalGraph.instance.build();
    GlobalGraph.instance.sort();

    // Create runtime load unit instances, again via the manifest loaders.
    for (const { absPath, decoratedFiles } of absModules) {
      const loader = new ModuleLoader(absPath, { precomputedFiles: decoratedFiles, loaderFS });
      const loadUnit = await LoadUnitFactory.createLoadUnit(absPath, EggLoadUnitType.MODULE, loader);
      loadUnitInstances.push(await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit));
    }
  });

  afterAll(async () => {
    for (const instance of loadUnitInstances) {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      await LoadUnitFactory.destroyLoadUnit(instance.loadUnit);
    }
  });

  it('should resolve module names from the real package.json without globbing', () => {
    // Sanity: non-discovery fs operations still work through the real fs.
    const repoName = ModuleConfigUtil.readModuleNameSync(path.join(fixturesRoot, 'multi-module-repo'));
    assert.equal(repoName, 'multi-module-repo');
  });

  it('should inject a public proto across module boundaries (manifest path)', async () => {
    const serviceInstance = loadUnitInstances.find((i) => i.loadUnit.unitPath.endsWith('multi-module-service'));
    assert.ok(serviceInstance, 'service load unit instance should exist');

    const appServiceProto = EggPrototypeFactory.instance.getPrototype('appService', serviceInstance.loadUnit);
    assert.ok(appServiceProto, 'appService prototype should be discovered from manifest decoratedFiles');

    const saveCtx = new EggTestContext();
    const findCtx = new EggTestContext();

    await ContextHandler.run(saveCtx, async () => {
      const obj = await EggContainerFactory.getOrCreateEggObject(appServiceProto, appServiceProto.name);
      const appService = obj.obj as AppService;
      // appService -> appRepo (other module, PUBLIC) -> persistenceService injected and usable
      await appService.save({ name: 'bundled-app', desc: 'loaded-from-manifest' });
    });

    const found = await ContextHandler.run(findCtx, async () => {
      const obj = await EggContainerFactory.getOrCreateEggObject(appServiceProto, appServiceProto.name);
      const appService = obj.obj as AppService;
      return appService.findApp('bundled-app');
    });

    assert.deepStrictEqual(found, { name: 'bundled-app', desc: 'loaded-from-manifest' });
  });
});
