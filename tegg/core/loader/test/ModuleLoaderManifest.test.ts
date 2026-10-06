import assert from 'node:assert/strict';
import path from 'node:path';

import { ManifestLoaderFS } from '@eggjs/loader-fs';
import { EggLoadUnitType } from '@eggjs/metadata';
import { afterEach, describe, it, vi } from 'vitest';

import { ModuleLoader } from '../src/impl/ModuleLoader.ts';
import { LoaderFactory } from '../src/index.ts';
import { LoaderUtil } from '../src/LoaderUtil.ts';

describe('core/loader/test/ModuleLoaderManifest.test.ts', () => {
  const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');

  function createLoader(files: string[]): ModuleLoader {
    const loaderFS = new ManifestLoaderFS({
      baseDir: repoModulePath,
      data: { fileDiscovery: { '': files }, resolveCache: {} },
    });
    return new ModuleLoader(repoModulePath, { loaderFS });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load only files exposed by the manifest view', async () => {
    const prototypes = await createLoader(['AppRepo.ts']).load();
    assert.deepStrictEqual(prototypes.map((prototype) => prototype.name).sort(), ['AppRepo', 'AppRepo2']);
  });

  it('should produce the same result as real filesystem discovery', async () => {
    const normalLoader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
    const normalProtos = await normalLoader.load();
    const manifestProtos = await createLoader(['AppRepo.ts', 'SprintRepo.ts', 'UserRepo.ts']).load();

    assert.deepStrictEqual(
      manifestProtos.map((prototype) => prototype.name).sort(),
      normalProtos.map((prototype) => prototype.name).sort(),
    );
  });

  it('should return an empty list for an empty manifest directory', async () => {
    assert.deepStrictEqual(await createLoader([]).load(), []);
  });

  it('should cache result on subsequent calls', async () => {
    const loader = createLoader(['AppRepo.ts']);
    const first = await loader.load();
    const second = await loader.load();
    assert.strictEqual(first, second);
  });

  it('should share an in-flight load between concurrent callers', async () => {
    const originalLoadFile = LoaderUtil.loadFile;
    let release: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const loadFile = vi.spyOn(LoaderUtil, 'loadFile').mockImplementation(async (filePath) => {
      await gate;
      return originalLoadFile.call(LoaderUtil, filePath);
    });
    const loader = createLoader(['AppRepo.ts']);

    const firstLoad = loader.load();
    const secondLoad = loader.load();
    assert.equal(loadFile.mock.calls.length, 1);
    release!();

    const [first, second] = await Promise.all([firstLoad, secondLoad]);
    assert.strictEqual(first, second);
    assert.equal(loadFile.mock.calls.length, 1);
  });

  it('should allow retry after an in-flight load fails', async () => {
    const originalLoadFile = LoaderUtil.loadFile;
    const loadFile = vi
      .spyOn(LoaderUtil, 'loadFile')
      .mockRejectedValueOnce(new Error('load failed'))
      .mockImplementation((filePath) => originalLoadFile.call(LoaderUtil, filePath));
    const loader = createLoader(['AppRepo.ts']);

    await assert.rejects(loader.load(), /load failed/);
    const prototypes = await loader.load();

    assert.equal(prototypes.length, 2);
    assert.equal(loadFile.mock.calls.length, 2);
  });
});
