import assert from 'node:assert/strict';

import { afterEach, describe, it } from 'vitest';

import { ManifestLoaderFS, RealLoaderFS } from '../src/index.ts';

const bundleGlobal = globalThis as typeof globalThis & {
  __EGG_BUNDLE_MODULE_LOADER__?: (filepath: string) => unknown;
};

describe('test/manifest_loader_fs.test.ts', () => {
  afterEach(() => {
    delete bundleGlobal.__EGG_BUNDLE_MODULE_LOADER__;
  });

  it('should expose manifest files through normal LoaderFS operations', async () => {
    class NoGlobFallback extends RealLoaderFS {
      glob(): string[] {
        throw new Error('manifest directory should not use fallback glob');
      }
    }

    const loaderFS = new ManifestLoaderFS(
      {
        baseDir: '/virtual/app',
        data: {
          fileDiscovery: { module: ['Service.ts'] },
          resolveCache: { 'config/plugin': 'config/plugin.js' },
        },
      },
      new NoGlobFallback(),
    );
    bundleGlobal.__EGG_BUNDLE_MODULE_LOADER__ = (filepath) => {
      if (filepath === 'config/plugin.js') return { default: { source: 'manifest' } };
    };

    assert.deepStrictEqual(loaderFS.glob('**/*.ts', { cwd: '/virtual/app/module' }), ['Service.ts']);
    assert.equal(loaderFS.exists('/virtual/app/module/Service.ts'), true);
    assert.equal(loaderFS.stat('/virtual/app/module').isDirectory(), true);
    assert.deepStrictEqual(await loaderFS.loadFile('/virtual/app/config/plugin'), { source: 'manifest' });
  });
});
