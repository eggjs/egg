import assert from 'node:assert/strict';
import path from 'node:path';

import { RealLoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import { ModuleDescriptorDumper } from '@eggjs/metadata';
import { describe, it } from 'vitest';

import { LoaderFactory } from '../src/index.ts';
import type { LoadAppManifest, ManifestModuleDescriptor } from '../src/index.ts';

describe('core/loader/test/LoaderFactoryManifest.test.ts', () => {
  const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');
  const moduleRef = { name: 'module-for-loader', path: repoModulePath };

  it('should load normally without manifest', async () => {
    const descriptors = await LoaderFactory.loadApp([moduleRef]);
    assert.equal(descriptors.length, 1);
    assert.equal(descriptors[0].name, 'module-for-loader');
    assert(descriptors[0].clazzList.length > 0);
  });

  it('should use precomputed files when manifest matches unitPath', async () => {
    // First: normal load to get decorated files
    const normalDescs = await LoaderFactory.loadApp([moduleRef]);
    const decoratedFiles = ModuleDescriptorDumper.getDecoratedFiles(normalDescs[0]);

    // Build manifest from the decorated files
    const manifest: LoadAppManifest = {
      moduleDescriptors: [
        {
          name: 'module-for-loader',
          unitPath: repoModulePath,
          decoratedFiles,
        },
      ],
    };

    // Load with manifest
    const manifestDescs = await LoaderFactory.loadApp([moduleRef], manifest);
    assert.equal(manifestDescs.length, 1);

    // Same classes loaded
    const normalNames = normalDescs[0].clazzList.map((c) => c.name).sort();
    const manifestNames = manifestDescs[0].clazzList.map((c) => c.name).sort();
    assert.deepStrictEqual(manifestNames, normalNames);
  });

  it('should fall back to globby for unmatched unitPath', async () => {
    const manifest: LoadAppManifest = {
      moduleDescriptors: [
        {
          name: 'other-module',
          unitPath: '/nonexistent/path',
          decoratedFiles: ['foo.ts'],
        },
      ],
    };

    // Should still work — falls back to normal globby
    const descriptors = await LoaderFactory.loadApp([moduleRef], manifest);
    assert.equal(descriptors.length, 1);
    assert(descriptors[0].clazzList.length > 0);
  });

  it('should roundtrip: loadApp → getDecoratedFiles → loadApp(manifest)', async () => {
    // Step 1: normal load
    const firstDescs = await LoaderFactory.loadApp([moduleRef]);

    // Step 2: build manifest
    const manifestDescs: ManifestModuleDescriptor[] = firstDescs.map((d) => ({
      name: d.name,
      unitPath: d.unitPath,
      optional: d.optional,
      decoratedFiles: ModuleDescriptorDumper.getDecoratedFiles(d),
    }));
    const manifest: LoadAppManifest = { moduleDescriptors: manifestDescs };

    // Step 3: reload with manifest
    const secondDescs = await LoaderFactory.loadApp([moduleRef], manifest);

    // Verify identical results
    assert.equal(firstDescs.length, secondDescs.length);
    for (let i = 0; i < firstDescs.length; i++) {
      assert.equal(firstDescs[i].name, secondDescs[i].name);
      assert.equal(firstDescs[i].unitPath, secondDescs[i].unitPath);
      const firstNames = firstDescs[i].clazzList.map((c) => c.name).sort();
      const secondNames = secondDescs[i].clazzList.map((c) => c.name).sort();
      assert.deepStrictEqual(secondNames, firstNames);
    }
  });

  it('should pass loaderFS to module loaders', async () => {
    const loaderFS = new RecordingLoaderFS();

    const descriptors = await LoaderFactory.loadApp([moduleRef], undefined, { loaderFS });

    assert.equal(descriptors.length, 1);
    assert(descriptors[0].clazzList.length > 0);
    assert.deepEqual(loaderFS.globCalls, [{ cwd: repoModulePath }]);
  });
});

class RecordingLoaderFS extends RealLoaderFS {
  readonly globCalls: Array<{ cwd: string | undefined }> = [];

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    this.globCalls.push({ cwd: options?.cwd ? String(options.cwd) : undefined });
    return super.glob(patterns, options);
  }
}
