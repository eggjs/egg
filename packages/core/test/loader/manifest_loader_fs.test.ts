import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { setBundleModuleLoader } from '@eggjs/utils';
import { afterEach, describe, it } from 'vitest';

import { ManifestLoaderFS, RealLoaderFS, type LoaderFSGlobOptions } from '../../src/loader/loader_fs.ts';
import { ManifestStore, type StartupManifest } from '../../src/loader/manifest.ts';

describe('test/loader/manifest_loader_fs.test.ts', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    setBundleModuleLoader(undefined);
    await Promise.all(createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('serves manifest-backed stat, realpath, glob, readJSON, and loadFile from the bundle map', async () => {
    const baseDir = await createTempDir(createdDirs, 'egg-manifest-loader-fs-');
    const manifest = createManifest({
      fileDiscovery: {
        'app/service': ['nested/order.ts', 'user.ts', 'user.d.ts'],
        config: ['config.default.ts', 'plugin.ts'],
        'node_modules/fake-plugin': ['app.ts', 'package.json'],
      },
      resolveCache: {
        'config/plugin': 'config/plugin.ts',
        'node_modules/fake-plugin/app': 'node_modules/fake-plugin/app.ts',
      },
    });
    const store = ManifestStore.fromBundle(manifest, baseDir);
    const modules: Record<string, unknown> = {
      'config/plugin.ts': { default: { fakePlugin: { enable: true, package: 'fake-plugin' } } },
      [normalize(path.join(baseDir, 'config/plugin.ts'))]: {
        default: { fakePlugin: { enable: true, package: 'fake-plugin' } },
      },
      'node_modules/fake-plugin/package.json': {
        default: { name: 'fake-plugin', version: '1.0.0', eggPlugin: { name: 'fakePlugin' } },
      },
      [normalize(path.join(baseDir, 'node_modules/fake-plugin/package.json'))]: {
        default: { name: 'fake-plugin', version: '1.0.0', eggPlugin: { name: 'fakePlugin' } },
      },
    };
    setBundleModuleLoader((filepath) => modules[filepath]);

    const loaderFS = new ManifestLoaderFS(store);
    const serviceFile = path.join(baseDir, 'app/service/user.ts');
    const serviceDir = path.join(baseDir, 'app/service');
    const pluginAlias = path.join(baseDir, 'config/plugin');
    const pluginPackage = path.join(baseDir, 'node_modules/fake-plugin/package.json');

    assert.equal(loaderFS.exists(serviceFile), true);
    assert.equal(loaderFS.exists(serviceDir), true);
    assert.equal(loaderFS.exists(pluginAlias), true);
    assert.equal(loaderFS.stat(serviceFile).isFile(), true);
    const serviceDirStat = loaderFS.stat(serviceDir);
    assert.equal(serviceDirStat.isDirectory(), true);
    assert.equal(serviceDirStat.mtime.getTime(), 0);
    assert.equal(loaderFS.realpath(pluginAlias), path.join(baseDir, 'config/plugin.ts'));
    assert.deepEqual(loaderFS.glob(['**/*.(js|ts)', '!**/*.d.ts'], { cwd: serviceDir }), [
      'nested/order.ts',
      'user.ts',
    ]);
    assert.deepEqual(loaderFS.glob('user.ts', { cwd: path.relative(process.cwd(), serviceDir), absolute: true }), [
      serviceFile,
    ]);
    assert.deepEqual(loaderFS.glob(['**/[no]*.ts', '!**/*.d.ts'], { cwd: serviceDir }), ['nested/order.ts']);
    assert.deepEqual(loaderFS.readJSON(pluginPackage), {
      name: 'fake-plugin',
      version: '1.0.0',
      eggPlugin: { name: 'fakePlugin' },
    });
    assert.deepEqual(await loaderFS.loadFile(pluginAlias), { fakePlugin: { enable: true, package: 'fake-plugin' } });
  });

  it('falls back to the real filesystem for paths missing from the manifest', async () => {
    const baseDir = await createTempDir(createdDirs, 'egg-manifest-loader-fs-fallback-');
    const realDir = path.join(baseDir, 'real');
    await fs.mkdir(realDir);
    await fs.writeFile(path.join(realDir, 'package.json'), JSON.stringify({ name: 'real-package' }));
    await fs.writeFile(path.join(realDir, 'config.js'), 'export default { real: true };\n');
    const store = ManifestStore.fromBundle(createManifest(), baseDir);
    const loaderFS = new ManifestLoaderFS(store);

    assert.equal(loaderFS.exists(path.join(realDir, 'package.json')), true);
    assert.equal(loaderFS.stat(path.join(realDir, 'package.json')).isFile(), true);
    assert.deepEqual(loaderFS.glob('**/*.js', { cwd: realDir }), ['config.js']);
    assert.deepEqual(loaderFS.readJSON(path.join(realDir, 'package.json')), { name: 'real-package' });
    assert.deepEqual(await loaderFS.loadFile(path.join(realDir, 'config.js')), { real: true });
  });

  it('prefers manifest and bundle-map results over same-path real files', async () => {
    const baseDir = await createTempDir(createdDirs, 'egg-manifest-loader-fs-priority-');
    await fs.mkdir(path.join(baseDir, 'config'));
    await fs.writeFile(path.join(baseDir, 'config/plugin.js'), 'export default { source: "real" };\n');
    const manifest = createManifest({
      fileDiscovery: {
        config: ['plugin.js'],
      },
    });
    const store = ManifestStore.fromBundle(manifest, baseDir);
    setBundleModuleLoader((filepath) => {
      if (filepath === 'config/plugin.js' || filepath === normalize(path.join(baseDir, 'config/plugin.js'))) {
        return { default: { source: 'manifest' } };
      }
    });

    const loaderFS = new ManifestLoaderFS(store);

    assert.deepEqual(await loaderFS.loadFile(path.join(baseDir, 'config/plugin.js')), { source: 'manifest' });
  });

  it('does not fall back when manifest covers an empty directory', async () => {
    const baseDir = await createTempDir(createdDirs, 'egg-manifest-loader-fs-empty-');
    const store = ManifestStore.fromBundle(
      createManifest({
        fileDiscovery: {
          empty: [],
        },
      }),
      baseDir,
    );
    const loaderFS = new ManifestLoaderFS(store, new ThrowingGlobLoaderFS());

    assert.deepEqual(loaderFS.glob('**/*.js', { cwd: path.join(baseDir, 'empty') }), []);
  });

  it('treats direct relative paths as process cwd relative before matching manifest entries', async () => {
    const baseDir = await createTempDir(createdDirs, 'egg-manifest-loader-fs-relative-');
    const cwd = await createTempDir(createdDirs, 'egg-manifest-loader-fs-cwd-');
    const store = ManifestStore.fromBundle(
      createManifest({
        fileDiscovery: {
          config: ['plugin.ts'],
        },
      }),
      baseDir,
    );
    const loaderFS = new ManifestLoaderFS(store, new MissingLoaderFS());
    const manifestFile = path.join(baseDir, 'config/plugin.ts');
    const cwdRelativeFile = path.relative(cwd, manifestFile);

    withProcessCwd(cwd, () => {
      assert.equal(loaderFS.exists(cwdRelativeFile), true);
      assert.equal(loaderFS.realpath(cwdRelativeFile), manifestFile);
      assert.equal(loaderFS.exists('config/plugin.ts'), false);
    });
  });

  it('does not fall back to real fs for explicit resolveCache misses', async () => {
    const baseDir = await createTempDir(createdDirs, 'egg-manifest-loader-fs-miss-');
    await fs.mkdir(path.join(baseDir, 'config'));
    await fs.writeFile(path.join(baseDir, 'config/missing'), '{"source":"real"}\n');
    const missingPath = path.join(baseDir, 'config/missing');
    const store = ManifestStore.fromBundle(
      createManifest({
        resolveCache: {
          'config/missing': null,
        },
      }),
      baseDir,
    );
    const loaderFS = new ManifestLoaderFS(store, new ThrowingLoaderFS());

    assert.equal(loaderFS.exists(missingPath), false);
    assert.throws(() => loaderFS.stat(missingPath), /ENOENT/);
    assert.throws(() => loaderFS.realpath(missingPath), /ENOENT/);
    assert.throws(() => loaderFS.readJSON(missingPath), /ENOENT/);
    await assert.rejects(() => loaderFS.loadFile(missingPath), /ENOENT/);
  });
});

class ThrowingGlobLoaderFS extends RealLoaderFS {
  glob(_patterns: string | string[], _options?: LoaderFSGlobOptions): string[] {
    throw new Error('unexpected real fs fallback');
  }
}

class MissingLoaderFS extends RealLoaderFS {
  exists(_filepath: string): boolean {
    return false;
  }
}

class ThrowingLoaderFS extends RealLoaderFS {
  exists(_filepath: string): boolean {
    throw new Error('unexpected real fs fallback');
  }

  stat(_filepath: string): never {
    throw new Error('unexpected real fs fallback');
  }

  realpath(_filepath: string): never {
    throw new Error('unexpected real fs fallback');
  }

  readJSON<T = unknown>(_filepath: string): T {
    throw new Error('unexpected real fs fallback');
  }

  async loadFile(_filepath: string): Promise<unknown> {
    throw new Error('unexpected real fs fallback');
  }
}

async function createTempDir(createdDirs: string[], prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

function createManifest(
  overrides: Partial<Pick<StartupManifest, 'fileDiscovery' | 'resolveCache'>> = {},
): StartupManifest {
  return {
    version: 1,
    generatedAt: '2026-05-10T00:00:00.000Z',
    invalidation: {
      lockfileFingerprint: '',
      configFingerprint: '',
      serverEnv: 'unittest',
      serverScope: '',
      typescriptEnabled: true,
    },
    extensions: {},
    resolveCache: overrides.resolveCache ?? {},
    fileDiscovery: overrides.fileDiscovery ?? {},
  };
}

function normalize(filepath: string): string {
  return filepath.replaceAll(path.sep, '/');
}

function withProcessCwd<T>(cwd: string, fn: () => T): T {
  const originalCwd = process.cwd.bind(process);
  process.cwd = () => cwd;
  try {
    return fn();
  } finally {
    process.cwd = originalCwd;
  }
}
