import assert from 'node:assert/strict';
import path from 'node:path';

import { type LoaderFS, RealLoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import { ModuleDescriptorDumper } from '@eggjs/metadata';
import { EggLoadUnitType, type TeggManifest, TeggScope } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { buildTeggManifestData, createTeggManifestLoaderFS, LoaderFactory } from '../src/index.ts';

describe('core/loader/test/LoaderFactoryManifest.test.ts', () => {
  const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');
  const moduleRef = { name: 'module-for-loader', path: repoModulePath };

  async function loadModule(loaderFS?: LoaderFS) {
    return await TeggScope.run(TeggScope.createBag(), async () => {
      return await LoaderFactory.loadApp([moduleRef], loaderFS);
    });
  }

  it('should load normally without manifest', async () => {
    const descriptors = await loadModule();
    assert.equal(descriptors.length, 1);
    assert.equal(descriptors[0].name, 'module-for-loader');
    assert(descriptors[0].clazzList.length > 0);
  });

  it('should load the same classes through a manifest-backed LoaderFS', async () => {
    const normalDescs = await loadModule();
    const manifest = buildTeggManifestData([moduleRef], normalDescs);
    const loaderFS = createTeggManifestLoaderFS(repoModulePath, manifest);

    const manifestDescs = await loadModule(loaderFS);
    const normalNames = normalDescs[0].clazzList.map((clazz) => clazz.name).sort();
    const manifestNames = manifestDescs[0].clazzList.map((clazz) => clazz.name).sort();
    assert.deepStrictEqual(manifestNames, normalNames);
  });

  it('should fall back to the real filesystem outside the manifest view', async () => {
    const manifest: TeggManifest = {
      moduleReferences: [],
      moduleDescriptors: [
        {
          name: 'other-module',
          unitPath: '/nonexistent/path',
          decoratedFiles: ['foo.ts'],
        },
      ],
    };
    const loaderFS = createTeggManifestLoaderFS('/nonexistent/path', manifest);

    const descriptors = await loadModule(loaderFS);
    assert.equal(descriptors.length, 1);
    assert(descriptors[0].clazzList.length > 0);
  });

  it('should route discovery through the selected LoaderFS', async () => {
    class StubLoaderFS extends RealLoaderFS {
      globCalls = 0;
      glob(_patterns: string | string[], _options?: LoaderFSGlobOptions): string[] {
        this.globCalls++;
        return ['UserRepo.ts'];
      }
    }
    const loaderFS = new StubLoaderFS();
    const descriptors = await loadModule(loaderFS);

    assert.deepStrictEqual(descriptors[0].clazzList.map((clazz) => clazz.name).sort(), ['UserRepo']);
    assert.equal(loaderFS.globCalls, 1);
  });

  it('should replace an earlier default and reuse the scoped LoaderFS for later module loaders', async () => {
    class NoGlobLoaderFS extends RealLoaderFS {
      glob(): string[] {
        throw new Error('manifest-backed module loading should not use the fallback glob');
      }
    }

    const manifest: TeggManifest = {
      moduleReferences: [moduleRef],
      moduleDescriptors: [
        {
          name: moduleRef.name,
          unitPath: repoModulePath,
          decoratedFiles: ['AppRepo.ts'],
        },
      ],
    };
    const loaderFS = createTeggManifestLoaderFS(repoModulePath, manifest, new NoGlobLoaderFS());

    await TeggScope.run(TeggScope.createBag(), async () => {
      // An earlier module loader may have initialized the scope with RealLoaderFS.
      LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      await LoaderFactory.loadApp([moduleRef], loaderFS);

      const dynamicLoader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      assert.deepStrictEqual((await dynamicLoader.load()).map((clazz) => clazz.name).sort(), ['AppRepo', 'AppRepo2']);
    });
  });

  it('should keep manifest file views isolated between app scopes', async () => {
    const createManifestLoaderFS = (decoratedFiles: string[]) =>
      createTeggManifestLoaderFS(repoModulePath, {
        moduleReferences: [moduleRef],
        moduleDescriptors: [{ name: moduleRef.name, unitPath: repoModulePath, decoratedFiles }],
      });
    const firstLoaderFS = createManifestLoaderFS(['AppRepo.ts']);
    const secondLoaderFS = createManifestLoaderFS(['UserRepo.ts']);
    const [firstNames, secondNames] = await Promise.all([
      TeggScope.run(TeggScope.createBag(), async () => {
        await LoaderFactory.loadApp([moduleRef], firstLoaderFS);
        const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
        return (await loader.load()).map((clazz) => clazz.name).sort();
      }),
      TeggScope.run(TeggScope.createBag(), async () => {
        await LoaderFactory.loadApp([moduleRef], secondLoaderFS);
        const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
        return (await loader.load()).map((clazz) => clazz.name).sort();
      }),
    ]);

    assert.deepStrictEqual(firstNames, ['AppRepo', 'AppRepo2']);
    assert.deepStrictEqual(secondNames, ['UserRepo']);
  });

  it('should roundtrip the shared TeggManifest contract', async () => {
    const firstDescs = await loadModule();
    const manifest = buildTeggManifestData([moduleRef], firstDescs);
    assert.deepStrictEqual(
      manifest.moduleDescriptors[0].decoratedFiles,
      ModuleDescriptorDumper.getDecoratedFiles(firstDescs[0]),
    );

    const loaderFS = createTeggManifestLoaderFS(repoModulePath, manifest);
    const secondDescs = await loadModule(loaderFS);

    assert.equal(secondDescs[0].name, firstDescs[0].name);
    assert.equal(secondDescs[0].unitPath, firstDescs[0].unitPath);
    assert.deepStrictEqual(
      secondDescs[0].clazzList.map((clazz) => clazz.name).sort(),
      firstDescs[0].clazzList.map((clazz) => clazz.name).sort(),
    );
  });

  it('should reject inconsistent module names in the manifest', () => {
    const manifest: TeggManifest = {
      moduleReferences: [moduleRef],
      moduleDescriptors: [
        {
          name: 'different-name',
          unitPath: repoModulePath,
          decoratedFiles: [],
        },
      ],
    };

    assert.throws(
      () => createTeggManifestLoaderFS(repoModulePath, manifest),
      /module name mismatch.*reference=module-for-loader, descriptor=different-name/,
    );
  });
});
