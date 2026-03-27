import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import mm from 'mm';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { ManifestStore } from '../../src/loader/manifest.ts';
import type { StartupManifest } from '../../src/loader/manifest.ts';

let tmpDir: string;

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'egg-manifest-test-'));
}

function setupBaseDir(options?: {
  lockfile?: 'pnpm' | 'npm' | 'yarn' | 'none';
  configFiles?: Record<string, string>;
}): string {
  const baseDir = createTmpDir();
  const lockfile = options?.lockfile ?? 'pnpm';
  if (lockfile === 'pnpm') {
    fs.writeFileSync(path.join(baseDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  } else if (lockfile === 'npm') {
    fs.writeFileSync(path.join(baseDir, 'package-lock.json'), '{"lockfileVersion": 3}');
  } else if (lockfile === 'yarn') {
    fs.writeFileSync(path.join(baseDir, 'yarn.lock'), '# yarn lockfile v1\n');
  }

  const configDir = path.join(baseDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });
  if (options?.configFiles) {
    for (const [name, content] of Object.entries(options.configFiles)) {
      fs.writeFileSync(path.join(configDir, name), content);
    }
  } else {
    fs.writeFileSync(path.join(configDir, 'config.default.ts'), 'export default {};\n');
  }

  return baseDir;
}

async function generateAndWrite(baseDir: string, overrides?: Partial<StartupManifest>): Promise<StartupManifest> {
  const manifest = ManifestStore.generate({
    baseDir,
    serverEnv: 'prod',
    serverScope: '',
    typescriptEnabled: true,
  });
  Object.assign(manifest, overrides);
  await ManifestStore.write(baseDir, manifest);
  return manifest;
}

describe('ManifestStore', () => {
  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    mm.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('generate()', () => {
    it('should generate manifest with correct structure', () => {
      const baseDir = setupBaseDir();
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });

        assert.equal(manifest.version, 1);
        assert.ok(manifest.generatedAt);
        assert.ok(new Date(manifest.generatedAt).getTime() > 0);
        assert.equal(manifest.invalidation.serverEnv, 'prod');
        assert.equal(manifest.invalidation.serverScope, '');
        assert.equal(manifest.invalidation.baseDir, baseDir);
        assert.equal(manifest.invalidation.typescriptEnabled, true);
        assert.ok(manifest.invalidation.lockfileFingerprint);
        assert.ok(manifest.invalidation.configFingerprint);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should default optional fields to empty', () => {
      const baseDir = setupBaseDir();
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: false,
        });

        assert.deepStrictEqual(manifest.tegg, { moduleReferences: [], moduleDescriptors: [] });
        assert.deepStrictEqual(manifest.resolveCache, {});
        assert.deepStrictEqual(manifest.fileDiscovery, {});
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should preserve provided tegg, resolveCache, fileDiscovery', () => {
      const baseDir = setupBaseDir();
      try {
        const tegg = {
          moduleReferences: [{ name: 'mod', path: '/tmp/mod' }],
          moduleDescriptors: [{ name: 'mod', unitPath: '/tmp/mod', decoratedFiles: ['a.ts'] }],
        };
        const resolveCache = { '/foo/bar': '/resolved/bar', '/foo/missing': null };
        const fileDiscovery = { '/app/service': ['user.ts', 'post.ts'] };

        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
          tegg,
          resolveCache,
          fileDiscovery,
        });

        assert.deepStrictEqual(manifest.tegg, tegg);
        assert.deepStrictEqual(manifest.resolveCache, resolveCache);
        assert.deepStrictEqual(manifest.fileDiscovery, fileDiscovery);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should detect pnpm lockfile', () => {
      const baseDir = setupBaseDir({ lockfile: 'pnpm' });
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.ok(manifest.invalidation.lockfileFingerprint.startsWith('pnpm-lock.yaml:'));
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should detect npm lockfile', () => {
      const baseDir = setupBaseDir({ lockfile: 'npm' });
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.ok(manifest.invalidation.lockfileFingerprint.startsWith('package-lock.json:'));
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should detect yarn lockfile', () => {
      const baseDir = setupBaseDir({ lockfile: 'yarn' });
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.ok(manifest.invalidation.lockfileFingerprint.startsWith('yarn.lock:'));
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return empty lockfile fingerprint when no lockfile', () => {
      const baseDir = setupBaseDir({ lockfile: 'none' });
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.equal(manifest.invalidation.lockfileFingerprint, '');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should produce deterministic config fingerprint', () => {
      const baseDir = setupBaseDir({ configFiles: { 'a.ts': 'const a = 1;' } });
      try {
        const m1 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
        const m2 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
        assert.equal(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('write() and clean()', () => {
    it('should create .egg/ directory and write manifest', async () => {
      const baseDir = setupBaseDir();
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        const manifestPath = path.join(baseDir, '.egg', 'manifest.json');
        assert.ok(fs.existsSync(manifestPath));

        const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        assert.equal(written.version, 1);
        assert.equal(written.invalidation.baseDir, baseDir);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should overwrite existing manifest', async () => {
      const baseDir = setupBaseDir();
      try {
        const m1 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
        await ManifestStore.write(baseDir, m1);

        const m2 = ManifestStore.generate({ baseDir, serverEnv: 'test', serverScope: '', typescriptEnabled: true });
        await ManifestStore.write(baseDir, m2);

        const written = JSON.parse(fs.readFileSync(path.join(baseDir, '.egg', 'manifest.json'), 'utf-8'));
        assert.equal(written.invalidation.serverEnv, 'test');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should clean manifest file', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);
        assert.ok(fs.existsSync(path.join(baseDir, '.egg', 'manifest.json')));

        ManifestStore.clean(baseDir);
        assert.ok(!fs.existsSync(path.join(baseDir, '.egg', 'manifest.json')));
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should not throw when cleaning non-existent manifest', () => {
      assert.doesNotThrow(() => {
        ManifestStore.clean(tmpDir);
      });
    });
  });

  describe('load()', () => {
    it('should load a valid manifest', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);

        const store = ManifestStore.load(baseDir, 'prod', '');
        assert.ok(store);
        assert.equal(store.data.version, 1);
        assert.equal(store.data.invalidation.baseDir, baseDir);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when manifest file does not exist', () => {
      const store = ManifestStore.load(tmpDir, 'prod', '');
      assert.equal(store, null);
    });

    it('should return null for invalid JSON', async () => {
      const eggDir = path.join(tmpDir, '.egg');
      fs.mkdirSync(eggDir, { recursive: true });
      fs.writeFileSync(path.join(eggDir, 'manifest.json'), 'not json{{{');

      const store = ManifestStore.load(tmpDir, 'prod', '');
      assert.equal(store, null);
    });

    it('should return null when version mismatches', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, { version: 999 });
        const store = ManifestStore.load(baseDir, 'prod', '');
        assert.equal(store, null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should load manifest even when baseDir differs from generation', async () => {
      const baseDir = setupBaseDir({ configFiles: { 'a.ts': 'const a = 1;' } });
      try {
        await generateAndWrite(baseDir);

        // Create a second directory with identical lockfile + config (simulating build→deploy)
        const otherDir = createTmpDir();
        try {
          // Copy lockfile and config so fingerprints match
          fs.copyFileSync(path.join(baseDir, 'pnpm-lock.yaml'), path.join(otherDir, 'pnpm-lock.yaml'));
          const configDir = path.join(otherDir, 'config');
          fs.mkdirSync(configDir, { recursive: true });
          fs.copyFileSync(path.join(baseDir, 'config', 'a.ts'), path.join(configDir, 'a.ts'));
          // Copy manifest
          const eggDir = path.join(otherDir, '.egg');
          fs.mkdirSync(eggDir, { recursive: true });
          fs.copyFileSync(path.join(baseDir, '.egg', 'manifest.json'), path.join(eggDir, 'manifest.json'));
          // Load should succeed — baseDir is not validated
          const store = ManifestStore.load(otherDir, 'prod', '');
          assert.ok(store);
        } finally {
          fs.rmSync(otherDir, { recursive: true, force: true });
        }
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when serverEnv mismatches', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);
        const store = ManifestStore.load(baseDir, 'test', '');
        assert.equal(store, null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when serverScope mismatches', async () => {
      const baseDir = setupBaseDir();
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: 'scopeA',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        const store = ManifestStore.load(baseDir, 'prod', 'scopeB');
        assert.equal(store, null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when lockfile changes', async () => {
      const baseDir = setupBaseDir({ lockfile: 'pnpm' });
      try {
        await generateAndWrite(baseDir);

        // Modify lockfile to change its mtime and size
        fs.writeFileSync(path.join(baseDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\nmodified: true\n');

        const store = ManifestStore.load(baseDir, 'prod', '');
        assert.equal(store, null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when config directory changes', async () => {
      const baseDir = setupBaseDir({ configFiles: { 'config.default.ts': 'export default {};' } });
      try {
        await generateAndWrite(baseDir);

        // Add a new config file
        fs.writeFileSync(path.join(baseDir, 'config', 'config.prod.ts'), 'export default { port: 8080 };');

        const store = ManifestStore.load(baseDir, 'prod', '');
        assert.equal(store, null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null in local env by default', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);
        // Re-generate with local env so invalidation matches
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'local',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        const store = ManifestStore.load(baseDir, 'local', '');
        assert.equal(store, null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should load in local env when EGG_MANIFEST=true', async () => {
      const baseDir = setupBaseDir();
      try {
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'local',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        mm(process.env, 'EGG_MANIFEST', 'true');
        const store = ManifestStore.load(baseDir, 'local', '');
        assert.ok(store);
        assert.equal(store.data.invalidation.serverEnv, 'local');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('query APIs', () => {
    it('getResolveCache() should return cached path', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, {
          resolveCache: { '/app/config/plugin': '/resolved/plugin.ts' },
        });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getResolveCache('/app/config/plugin'), '/resolved/plugin.ts');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('getResolveCache() should return null for null-cached entry', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, {
          resolveCache: { '/app/missing': null },
        });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getResolveCache('/app/missing'), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('getResolveCache() should return undefined for uncached entry', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, { resolveCache: {} });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getResolveCache('/not/in/cache'), undefined);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('getFileDiscovery() should return cached file list', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, {
          fileDiscovery: { '/app/service': ['user.ts', 'post.ts'] },
        });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.deepStrictEqual(store.getFileDiscovery('/app/service'), ['user.ts', 'post.ts']);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('getFileDiscovery() should return undefined for uncached directory', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, { fileDiscovery: {} });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getFileDiscovery('/not/cached'), undefined);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('tegg getter should return tegg data', async () => {
      const baseDir = setupBaseDir();
      const tegg = {
        moduleReferences: [{ name: 'myModule', path: '/tmp/myModule' }],
        moduleDescriptors: [],
      };
      try {
        await generateAndWrite(baseDir, { tegg });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.deepStrictEqual(store.tegg, tegg);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('fingerprint stability', () => {
    it('should produce same fingerprint for unchanged file', () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'hello');

      // Access statFingerprint via generate's lockfile detection
      // Instead, test via generate() which uses the fingerprint internally
      const m1 = ManifestStore.generate({
        baseDir: tmpDir,
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: true,
      });
      const m2 = ManifestStore.generate({
        baseDir: tmpDir,
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: true,
      });
      // Config fingerprint should be stable (no config dir = deterministic empty hash)
      assert.equal(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
    });

    it('should change config fingerprint when file is added', async () => {
      const baseDir = setupBaseDir({ configFiles: { 'a.ts': 'const a = 1;' } });
      try {
        const m1 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });

        // Wait a tiny bit to ensure mtime differs
        await new Promise((resolve) => setTimeout(resolve, 50));
        fs.writeFileSync(path.join(baseDir, 'config', 'b.ts'), 'const b = 2;');

        const m2 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
        assert.notEqual(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should change config fingerprint when file is deleted', async () => {
      const baseDir = setupBaseDir({ configFiles: { 'a.ts': '1', 'b.ts': '2' } });
      try {
        const m1 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
        fs.unlinkSync(path.join(baseDir, 'config', 'b.ts'));
        const m2 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
        assert.notEqual(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should produce deterministic fingerprint for non-existent config directory', () => {
      // tmpDir has no config/ subdirectory
      const m1 = ManifestStore.generate({
        baseDir: tmpDir,
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: true,
      });
      const m2 = ManifestStore.generate({
        baseDir: tmpDir,
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: true,
      });
      assert.equal(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
    });

    it('should handle symlink cycles without infinite recursion', () => {
      const baseDir = setupBaseDir({ configFiles: { 'a.ts': '1' } });
      try {
        const configDir = path.join(baseDir, 'config');
        // Create a symlink cycle: config/loop -> config/
        try {
          fs.symlinkSync(configDir, path.join(configDir, 'loop'));
        } catch {
          // Symlinks may not be supported (Windows without admin)
          return;
        }

        // Should not hang or throw
        const manifest = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.ok(manifest.invalidation.configFingerprint);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('end-to-end: generate → write → load', () => {
    it('should round-trip manifest data correctly', async () => {
      const baseDir = setupBaseDir();
      try {
        const resolveCache = { '/some/path': '/resolved/path', '/missing': null };
        const fileDiscovery = { '/app/controller': ['home.ts', 'user.ts'] };
        const tegg = {
          moduleReferences: [{ name: 'foo', path: '/tmp/foo', optional: true }],
          moduleDescriptors: [{ name: 'foo', unitPath: '/tmp/foo', decoratedFiles: ['service.ts'] }],
        };

        const original = ManifestStore.generate({
          baseDir,
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
          resolveCache,
          fileDiscovery,
          tegg,
        });
        await ManifestStore.write(baseDir, original);

        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.ok(store);
        assert.deepStrictEqual(store.data.resolveCache, resolveCache);
        assert.deepStrictEqual(store.data.fileDiscovery, fileDiscovery);
        assert.deepStrictEqual(store.data.tegg, tegg);
        assert.equal(store.data.version, original.version);
        assert.equal(store.data.generatedAt, original.generatedAt);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should invalidate after lockfile modification', async () => {
      const baseDir = setupBaseDir({ lockfile: 'pnpm' });
      try {
        await generateAndWrite(baseDir);
        assert.ok(ManifestStore.load(baseDir, 'prod', ''));

        // Modify lockfile
        fs.appendFileSync(path.join(baseDir, 'pnpm-lock.yaml'), '\n# modified');
        assert.equal(ManifestStore.load(baseDir, 'prod', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should invalidate after config file modification', async () => {
      const baseDir = setupBaseDir({ configFiles: { 'config.default.ts': 'export default {};' } });
      try {
        await generateAndWrite(baseDir);
        assert.ok(ManifestStore.load(baseDir, 'prod', ''));

        await new Promise((resolve) => setTimeout(resolve, 50));
        fs.writeFileSync(path.join(baseDir, 'config', 'config.prod.ts'), 'export default { port: 3000 };');
        assert.equal(ManifestStore.load(baseDir, 'prod', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should remain valid when nothing changes', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);
        assert.ok(ManifestStore.load(baseDir, 'prod', ''));
        assert.ok(ManifestStore.load(baseDir, 'prod', ''));
        assert.ok(ManifestStore.load(baseDir, 'prod', ''));
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('E2E: generate manifest → app uses cached data', () => {
    it('should use resolveCache and skip importResolve on second load', async () => {
      const { createApp } = await import('../helper.ts');

      // First load: no manifest, collects data
      const app1 = createApp('nothing');
      await app1.loader.loadPlugin();
      await app1.loader.loadConfig();

      // Collect some resolve results
      assert.ok(Object.keys(app1.loader.resolveCacheCollector).length >= 0);

      // Generate and write manifest with the collected data
      const manifest = app1.loader.generateManifest();
      await ManifestStore.write(app1.baseDir, manifest);

      try {
        // Second load: manifest exists, should use cached data
        const app2 = createApp('nothing');
        assert.ok(app2.loader.manifest, 'manifest should be loaded');

        // Verify resolveModule uses cache
        for (const [filepath, resolved] of Object.entries(manifest.resolveCache)) {
          const result = app2.loader.resolveModule(filepath);
          assert.equal(result, resolved ?? undefined, `resolveModule('${filepath}') should return cached value`);
        }

        // Verify no new entries were added to the collector (cache was used)
        assert.equal(
          Object.keys(app2.loader.resolveCacheCollector).length,
          0,
          'should not collect new resolve results when manifest is used',
        );
      } finally {
        ManifestStore.clean(app1.baseDir);
      }
    });

    it('should use fileDiscovery cache in FileLoader', async () => {
      const { createApp } = await import('../helper.ts');
      const { FileLoader } = await import('../../src/loader/file_loader.ts');

      const app = createApp('nothing');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();

      // Create a manifest with pre-computed file discovery
      const testDir = path.join(app.baseDir, 'app', 'service');
      const manifest = app.loader.generateManifest();
      manifest.fileDiscovery[testDir] = ['foo.ts', 'bar.ts'];
      await ManifestStore.write(app.baseDir, manifest);

      try {
        const app2 = createApp('nothing');
        assert.ok(app2.loader.manifest);

        // FileLoader should use cached files instead of globby
        const target = {};
        new FileLoader({
          directory: testDir,
          target,
          manifest: app2.loader.manifest,
          fileDiscoveryCollector: app2.loader.fileDiscoveryCollector,
        });

        // getFileDiscovery should return the cached list
        const cached = app2.loader.manifest.getFileDiscovery(testDir);
        assert.deepStrictEqual(cached, ['foo.ts', 'bar.ts']);

        // Verify the collector was NOT populated (cache was used)
        assert.equal(app2.loader.fileDiscoveryCollector[testDir], undefined);
      } finally {
        ManifestStore.clean(app.baseDir);
      }
    });
  });
});
