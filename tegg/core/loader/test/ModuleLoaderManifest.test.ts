import assert from 'node:assert/strict';
import path from 'node:path';

import { EggLoadUnitType } from '@eggjs/metadata';
import { describe, it } from 'vitest';

import { ModuleLoader } from '../src/impl/ModuleLoader.ts';
import { LoaderFactory } from '../src/index.ts';

describe('core/loader/test/ModuleLoaderManifest.test.ts', () => {
  const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');

  it('should load only precomputed files when provided', async () => {
    const loader = new ModuleLoader(repoModulePath, ['AppRepo.ts']);
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
    const manifestLoader = new ModuleLoader(repoModulePath, fileNames);
    const manifestProtos = await manifestLoader.load();

    // Same number and same class names
    assert.equal(manifestProtos.length, normalProtos.length);
    const normalNames = normalProtos.map((p) => p.name).sort();
    const manifestNames = manifestProtos.map((p) => p.name).sort();
    assert.deepStrictEqual(manifestNames, normalNames);
  });

  it('should return empty list for empty precomputedFiles', async () => {
    const loader = new ModuleLoader(repoModulePath, []);
    const prototypes = await loader.load();
    assert.equal(prototypes.length, 0);
  });

  it('should cache result on subsequent calls', async () => {
    const loader = new ModuleLoader(repoModulePath, ['AppRepo.ts']);
    const first = await loader.load();
    const second = await loader.load();
    assert.strictEqual(first, second);
  });
});
