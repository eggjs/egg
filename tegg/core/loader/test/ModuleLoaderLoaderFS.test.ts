import assert from 'node:assert/strict';
import path from 'node:path';

import { ManifestLoaderFS, RealLoaderFS, type LoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import { TeggScope } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { ModuleLoader } from '../src/impl/ModuleLoader.ts';

describe('core/loader/test/ModuleLoaderLoaderFS.test.ts', () => {
  const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');

  /** A LoaderFS whose glob returns a fixed list; everything else delegates to the real fs. */
  class StubLoaderFS extends RealLoaderFS implements LoaderFS {
    globCalls: Array<{ patterns: string | string[]; options?: LoaderFSGlobOptions }> = [];
    private readonly files: string[];
    constructor(files: string[]) {
      super();
      this.files = files;
    }
    glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
      this.globCalls.push({ patterns, options });
      return this.files;
    }
  }

  it('should discover files through the injected LoaderFS.glob', async () => {
    const loaderFS = new StubLoaderFS(['UserRepo.ts']);
    const loader = new ModuleLoader(repoModulePath, { loaderFS });
    const prototypes = await loader.load();

    // Only the single file the stub returned is loaded (UserRepo).
    assert.equal(prototypes.length, 1);
    assert(prototypes.find((t) => t.name === 'UserRepo'));
    // Discovery went through the injected fs with the module dir as cwd.
    assert.equal(loaderFS.globCalls.length, 1);
    assert.equal(loaderFS.globCalls[0].options?.cwd, repoModulePath);
  });

  it('should use the manifest view instead of its fallback glob', async () => {
    const fallback = new StubLoaderFS(['UserRepo.ts']);
    const loaderFS = new ManifestLoaderFS(
      {
        baseDir: repoModulePath,
        data: { fileDiscovery: { '': ['AppRepo.ts'] }, resolveCache: {} },
      },
      fallback,
    );
    const loader = new ModuleLoader(repoModulePath, { loaderFS });
    const prototypes = await loader.load();

    assert.equal(prototypes.length, 2);
    assert.equal(fallback.globCalls.length, 0);
  });

  it('should default to RealLoaderFS discovery when no LoaderFS is injected', async () => {
    const loader = new ModuleLoader(repoModulePath);
    const prototypes = await loader.load();

    // Real globby-equivalent discovery finds every decorated class in the fixture.
    const names = prototypes.map((p) => p.name).sort();
    assert.deepStrictEqual(names, ['AppRepo', 'AppRepo2', 'SprintRepo', 'UserRepo']);
  });

  it('createModuleLoader should forward the injected LoaderFS', async () => {
    const loaderFS = new StubLoaderFS(['SprintRepo.ts']);
    const prototypes = await TeggScope.run(TeggScope.createBag(), async () => {
      const loader = ModuleLoader.createModuleLoader(repoModulePath, loaderFS);
      return await loader.load();
    });

    assert.equal(prototypes.length, 1);
    assert(prototypes.find((t) => t.name === 'SprintRepo'));
    assert.equal(loaderFS.globCalls.length, 1);
  });
});
