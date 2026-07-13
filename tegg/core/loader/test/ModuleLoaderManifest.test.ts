import assert from 'node:assert/strict';
import path from 'node:path';

import { EggLoadUnitType } from '@eggjs/metadata';
import { afterEach, describe, it, vi } from 'vitest';

import { ModuleLoader } from '../src/impl/ModuleLoader.ts';
import { LoaderFactory } from '../src/index.ts';
import { LoaderUtil } from '../src/LoaderUtil.ts';

describe('core/loader/test/ModuleLoaderManifest.test.ts', () => {
  const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load only precomputed files when provided', async () => {
    const loader = new ModuleLoader(repoModulePath, { precomputedFiles: ['AppRepo.ts'] });
    const prototypes = await loader.load();
    // AppRepo.ts has 2 decorated classes: AppRepo and AppRepo2
    assert.equal(prototypes.length, 2);
    assert(prototypes.find((t) => t.name === 'AppRepo'));
    assert(prototypes.find((t) => t.name === 'AppRepo2'));
  });

  it('should produce same result as globby-based loading', async () => {
    // Load via globby (normal path)
    const normalLoader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
    const normalProtos = await normalLoader.load();

    // Load via precomputed files (manifest path)
    // Get the file list from normal loading to ensure consistency
    const fileNames = ['AppRepo.ts', 'SprintRepo.ts', 'UserRepo.ts'];
    const manifestLoader = new ModuleLoader(repoModulePath, { precomputedFiles: fileNames });
    const manifestProtos = await manifestLoader.load();

    // Same number and same class names
    assert.equal(manifestProtos.length, normalProtos.length);
    const normalNames = normalProtos.map((p) => p.name).sort();
    const manifestNames = manifestProtos.map((p) => p.name).sort();
    assert.deepStrictEqual(manifestNames, normalNames);
  });

  it('should return empty list for empty precomputedFiles', async () => {
    const loader = new ModuleLoader(repoModulePath, { precomputedFiles: [] });
    const prototypes = await loader.load();
    assert.equal(prototypes.length, 0);
  });

  it('should cache result on subsequent calls', async () => {
    const loader = new ModuleLoader(repoModulePath, { precomputedFiles: ['AppRepo.ts'] });
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
    const loader = new ModuleLoader(repoModulePath, { precomputedFiles: ['AppRepo.ts'] });

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
    const loader = new ModuleLoader(repoModulePath, { precomputedFiles: ['AppRepo.ts'] });

    await assert.rejects(loader.load(), /load failed/);
    const prototypes = await loader.load();

    assert.equal(prototypes.length, 2);
    assert.equal(loadFile.mock.calls.length, 2);
  });
});
