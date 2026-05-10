import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import globby from 'globby';
import { describe, it } from 'vitest';

import { ManifestLoaderFS, RealLoaderFS, readFileWithLoaderFS, type LoaderFS } from '../../src/loader/loader_fs.ts';
import { ManifestStore, type StartupManifest } from '../../src/loader/manifest.ts';
import utils from '../../src/utils/index.ts';
import { getFilepath } from '../helper.ts';

describe('test/loader/loader_fs.test.ts', () => {
  const loaderFS = new RealLoaderFS();
  const baseDir = getFilepath('loadfile');

  it('should wrap exists/stat/realpath with node fs behavior', () => {
    const filepath = path.join(baseDir, 'object.js');

    assert.equal(loaderFS.exists(filepath), fs.existsSync(filepath));
    assert.equal(loaderFS.exists(path.join(baseDir, 'not-exists.js')), false);
    assert.equal(loaderFS.stat(filepath).isFile(), fs.statSync(filepath).isFile());
    assert.equal(loaderFS.realpath(baseDir), fs.realpathSync(baseDir));
  });

  it('should wrap readJSON/glob/loadFile with current loader behavior', async () => {
    const packagePath = path.join(baseDir, 'package.json');
    const patterns = ['*.js', '!null.js'];

    assert.deepEqual(await loaderFS.readJSON(packagePath), JSON.parse(fs.readFileSync(packagePath, 'utf8')));
    assert.deepEqual(loaderFS.glob(patterns, { cwd: baseDir }).sort(), globby.sync(patterns, { cwd: baseDir }).sort());
    assert.deepEqual(
      await loaderFS.loadFile(path.join(baseDir, 'object.js')),
      await utils.loadFile(path.join(baseDir, 'object.js')),
    );
  });

  it('should allow custom loaderFS implementations without readFile', () => {
    const compatLoaderFS: LoaderFS = {
      exists: loaderFS.exists.bind(loaderFS),
      stat: loaderFS.stat.bind(loaderFS),
      realpath: loaderFS.realpath.bind(loaderFS),
      readJSON: loaderFS.readJSON.bind(loaderFS),
      glob: loaderFS.glob.bind(loaderFS),
      loadFile: loaderFS.loadFile.bind(loaderFS),
    };

    assert(readFileWithLoaderFS(compatLoaderFS, path.join(baseDir, 'package.json'), 'utf8').includes('"type"'));
  });

  it('should answer manifest-backed file stats without touching the delegate filesystem', () => {
    const manifest: StartupManifest = {
      version: 1,
      generatedAt: '2026-05-10T00:00:00.000Z',
      invalidation: {
        lockfileFingerprint: '',
        configFingerprint: '',
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: false,
      },
      extensions: {},
      resolveCache: {
        'config/plugin': 'config/plugin.js',
      },
      fileDiscovery: {
        'app/controller': ['home.js'],
      },
    };
    class NoStatLoaderFS extends RealLoaderFS {
      stat(): fs.Stats {
        throw new Error('delegate stat should not run for manifest-known paths');
      }

      exists(): boolean {
        throw new Error('delegate exists should not run for manifest-known paths');
      }
    }
    const manifestFS = new ManifestLoaderFS(
      '/bundle/app',
      ManifestStore.fromBundle(manifest, '/bundle/app'),
      new NoStatLoaderFS(),
    );

    assert.equal(manifestFS.exists('/bundle/app/app/controller'), true);
    assert.equal(manifestFS.exists('/bundle/app/app'), true);
    assert.equal(manifestFS.stat('/bundle/app/app').isDirectory(), true);
    assert.equal(manifestFS.stat('/bundle/app/app/controller').isDirectory(), true);
    assert.equal(manifestFS.exists('/bundle/app/app/controller/home.js'), true);
    const fileStat = manifestFS.stat('/bundle/app/app/controller/home.js');
    assert.equal(fileStat.isFile(), true);
    assert.equal(typeof fileStat.mode, 'number');
    assert(fileStat.mtime instanceof Date);
    assert.equal(manifestFS.exists('/bundle/app/config/plugin.js'), true);
    assert.equal(manifestFS.stat('/bundle/app/config/plugin.js').isFile(), true);
  });

  it('should preserve bundled text file read/load behavior', async () => {
    const originalFileLoader = globalThis.__EGG_BUNDLE_FILE_LOADER__;
    globalThis.__EGG_BUNDLE_FILE_LOADER__ = (rel) => {
      if (rel === 'config/app.json') return '{"name":"egg"}';
    };
    const manifestFS = new ManifestLoaderFS(
      '/bundle/app',
      ManifestStore.fromBundle(
        {
          version: 1,
          generatedAt: '2026-05-10T00:00:00.000Z',
          invalidation: {
            lockfileFingerprint: '',
            configFingerprint: '',
            serverEnv: 'prod',
            serverScope: '',
            typescriptEnabled: false,
          },
          extensions: {},
          resolveCache: {},
          fileDiscovery: {},
        },
        '/bundle/app',
      ),
    );

    try {
      assert.equal(manifestFS.exists('/bundle/app/config/app.json'), true);
      assert.equal(manifestFS.stat('/bundle/app/config/app.json').isFile(), true);
      assert.equal(
        manifestFS.readFile('/bundle/app/config/app.json', 'base64'),
        Buffer.from('{"name":"egg"}').toString('base64'),
      );
      assert.deepEqual(await manifestFS.loadFile('/bundle/app/config/app.json'), { name: 'egg' });
    } finally {
      globalThis.__EGG_BUNDLE_FILE_LOADER__ = originalFileLoader;
    }
  });
});
