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
    assert.deepStrictEqual(loaderFS.getKnownFiles('/virtual/app/module'), ['Service.ts']);
    assert.deepStrictEqual(loaderFS.getKnownFiles('/virtual/app/empty'), undefined);
    assert.equal(loaderFS.exists('/virtual/app/module/Service.ts'), true);
    assert.equal(loaderFS.stat('/virtual/app/module').isDirectory(), true);
    assert.deepStrictEqual(await loaderFS.loadFile('/virtual/app/config/plugin'), { source: 'manifest' });
  });

  it('should preserve an authoritative empty directory and delegate unknown directories', () => {
    class KnownFilesFallback extends RealLoaderFS {
      getKnownFiles(directory: string): readonly string[] | undefined {
        return directory === '/virtual/fallback' || directory === '/virtual/app' ? ['fallback.js'] : undefined;
      }
    }

    const loaderFS = new ManifestLoaderFS(
      {
        baseDir: '/virtual/app',
        data: { fileDiscovery: { empty: [] }, resolveCache: {} },
      },
      new KnownFilesFallback(),
    );

    assert.deepStrictEqual(loaderFS.getKnownFiles('/virtual/app/empty'), []);
    assert.deepStrictEqual(loaderFS.getKnownFiles('/virtual/fallback'), ['fallback.js']);
    assert.deepStrictEqual(loaderFS.getKnownFiles('/virtual/app'), ['fallback.js']);
  });
});
