import assert from 'node:assert/strict';
import fs from 'node:fs';
import module from 'node:module';
import path from 'node:path';

import mm from 'mm';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { ManifestStore } from '../../src/loader/manifest.ts';
import { createTmpDir, setupBaseDir, generateAndWrite } from './manifest_helper.ts';

let tmpDir: string;

describe('ManifestStore', () => {
  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    mm.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('generateManifest()', () => {
    it('should generate manifest with correct structure', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });

        assert.equal(manifest.version, 1);
        assert.ok(manifest.generatedAt);
        assert.ok(new Date(manifest.generatedAt).getTime() > 0);
        assert.equal(manifest.invalidation.serverEnv, 'prod');
        assert.equal(manifest.invalidation.serverScope, '');
        assert.equal(manifest.invalidation.typescriptEnabled, true);
        assert.ok(manifest.invalidation.lockfileFingerprint);
        assert.ok(manifest.invalidation.configFingerprint);
        // No baseDir in invalidation
        assert.equal('baseDir' in manifest.invalidation, false);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should default optional fields to empty', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: false,
        });

        assert.deepStrictEqual(manifest.extensions, {});
        assert.deepStrictEqual(manifest.resolveCache, {});
        assert.deepStrictEqual(manifest.fileDiscovery, {});
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should preserve extensions set via setExtension', () => {
      const baseDir = setupBaseDir();
      try {
        const teggData = { moduleReferences: [{ name: 'mod', path: '/tmp/mod' }] };
        const collector = ManifestStore.createCollector(baseDir);
        collector.setExtension('tegg', teggData);
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });

        assert.deepStrictEqual(manifest.extensions, { tegg: teggData });
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should collect resolveModule results as relative paths', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);

        // Simulate resolveModule calls
        collector.resolveModule(path.join(baseDir, 'config/plugin'), () => path.join(baseDir, 'config/plugin.ts'));
        collector.resolveModule(path.join(baseDir, 'app/missing'), () => undefined);

        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });

        assert.equal(manifest.resolveCache['config/plugin'], 'config/plugin.ts');
        assert.equal(manifest.resolveCache['app/missing'], null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should collect globFiles results as relative paths', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);

        collector.globFiles(path.join(baseDir, 'app/service'), () => ['user.ts', 'post.ts']);

        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });

        assert.deepStrictEqual(manifest.fileDiscovery['app/service'], ['user.ts', 'post.ts']);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should detect pnpm lockfile', () => {
      const baseDir = setupBaseDir({ lockfile: 'pnpm' });
      try {
        const manifest = ManifestStore.createCollector(baseDir).generateManifest({
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
        const manifest = ManifestStore.createCollector(baseDir).generateManifest({
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
        const manifest = ManifestStore.createCollector(baseDir).generateManifest({
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
        const manifest = ManifestStore.createCollector(baseDir).generateManifest({
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
        const m1 = ManifestStore.createCollector(baseDir).generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        const m2 = ManifestStore.createCollector(baseDir).generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
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
        await generateAndWrite(baseDir);

        const manifestPath = path.join(baseDir, '.egg', 'manifest.json');
        assert.ok(fs.existsSync(manifestPath));

        const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        assert.equal(written.version, 1);
        assert.equal(written.invalidation.serverEnv, 'prod');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should overwrite existing manifest', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);

        const m2 = ManifestStore.createCollector(baseDir).generateManifest({
          serverEnv: 'test',
          serverScope: '',
          typescriptEnabled: true,
        });
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
        assert.equal(store.baseDir, baseDir);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when manifest file does not exist', () => {
      const store = ManifestStore.load(tmpDir, 'prod', '');
      assert.equal(store, null);
    });

    it('should return null for invalid JSON', () => {
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
        assert.equal(ManifestStore.load(baseDir, 'prod', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when serverEnv mismatches', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);
        assert.equal(ManifestStore.load(baseDir, 'test', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when serverScope mismatches', async () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: 'scopeA',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);
        assert.equal(ManifestStore.load(baseDir, 'prod', 'scopeB'), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when lockfile changes', async () => {
      const baseDir = setupBaseDir({ lockfile: 'pnpm' });
      try {
        await generateAndWrite(baseDir);
        fs.writeFileSync(path.join(baseDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\nmodified: true\n');
        assert.equal(ManifestStore.load(baseDir, 'prod', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null when config directory changes', async () => {
      const baseDir = setupBaseDir({ configFiles: { 'config.default.ts': 'export default {};' } });
      try {
        await generateAndWrite(baseDir);
        fs.writeFileSync(path.join(baseDir, 'config', 'config.prod.ts'), 'export default { port: 8080 };');
        assert.equal(ManifestStore.load(baseDir, 'prod', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return null in local env by default', async () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const manifest = collector.generateManifest({
          serverEnv: 'local',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);
        assert.equal(ManifestStore.load(baseDir, 'local', ''), null);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should load in local env when EGG_MANIFEST=true', async () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const manifest = collector.generateManifest({
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

  describe('resolveModule()', () => {
    it('should return cached result from loaded manifest', async () => {
      const baseDir = setupBaseDir();
      try {
        // Generate manifest with a resolve cache entry
        const collector = ManifestStore.createCollector(baseDir);
        collector.resolveModule(path.join(baseDir, 'config/plugin'), () => path.join(baseDir, 'config/plugin.ts'));
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        // Load and verify cache hit
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        let fallbackCalled = false;
        const result = store.resolveModule(path.join(baseDir, 'config/plugin'), () => {
          fallbackCalled = true;
          return undefined;
        });
        assert.equal(result, path.join(baseDir, 'config/plugin.ts'));
        assert.equal(fallbackCalled, false);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return undefined for null-cached entry', async () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        collector.resolveModule(path.join(baseDir, 'app/missing'), () => undefined);
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        const store = ManifestStore.load(baseDir, 'prod', '')!;
        const result = store.resolveModule(path.join(baseDir, 'app/missing'), () => {
          throw new Error('should not be called');
        });
        assert.equal(result, undefined);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should call fallback on cache miss and collect result', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const result = collector.resolveModule(path.join(baseDir, 'config/plugin'), () =>
          path.join(baseDir, 'config/plugin.ts'),
        );
        assert.equal(result, path.join(baseDir, 'config/plugin.ts'));
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('globFiles()', () => {
    it('should return cached result from loaded manifest', async () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        collector.globFiles(path.join(baseDir, 'app/service'), () => ['user.ts', 'post.ts']);
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        const store = ManifestStore.load(baseDir, 'prod', '')!;
        const result = store.globFiles(path.join(baseDir, 'app/service'), () => {
          throw new Error('should not be called');
        });
        assert.deepStrictEqual(result, ['user.ts', 'post.ts']);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should call fallback on cache miss and collect result', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const result = collector.globFiles(path.join(baseDir, 'app/controller'), () => ['home.ts']);
        assert.deepStrictEqual(result, ['home.ts']);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('setExtension()', () => {
    it('should store and retrieve extension data', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        const data = { modules: ['a', 'b'] };
        collector.setExtension('tegg', data);
        // Not accessible via getExtension until generateManifest
        // (getExtension reads from data, not collector)
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.deepStrictEqual(manifest.extensions.tegg, data);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should support multiple extension keys', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        collector.setExtension('tegg', { a: 1 });
        collector.setExtension('custom', { b: 2 });
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.deepStrictEqual(manifest.extensions.tegg, { a: 1 });
        assert.deepStrictEqual(manifest.extensions.custom, { b: 2 });
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should overwrite previous value for same key', () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        collector.setExtension('tegg', { old: true });
        collector.setExtension('tegg', { new: true });
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        assert.deepStrictEqual(manifest.extensions.tegg, { new: true });
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should survive write → load roundtrip', async () => {
      const baseDir = setupBaseDir();
      try {
        const collector = ManifestStore.createCollector(baseDir);
        collector.setExtension('tegg', { roundtrip: true });
        const manifest = collector.generateManifest({
          serverEnv: 'prod',
          serverScope: '',
          typescriptEnabled: true,
        });
        await ManifestStore.write(baseDir, manifest);

        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.ok(store);
        assert.deepStrictEqual(store.getExtension('tegg'), { roundtrip: true });
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('compile cache', () => {
    const savedCompileCache = process.env.NODE_COMPILE_CACHE;
    const savedPortable = process.env.NODE_COMPILE_CACHE_PORTABLE;
    const savedDisable = process.env.NODE_DISABLE_COMPILE_CACHE;

    afterEach(() => {
      for (const [key, saved] of [
        ['NODE_COMPILE_CACHE', savedCompileCache],
        ['NODE_COMPILE_CACHE_PORTABLE', savedPortable],
        ['NODE_DISABLE_COMPILE_CACHE', savedDisable],
      ] as const) {
        if (saved !== undefined) {
          process.env[key] = saved;
        } else {
          delete process.env[key];
        }
      }
    });

    it('should enable compile cache, set env vars, and generate cache files', () => {
      const baseDir = setupBaseDir();
      try {
        ManifestStore.enableCompileCache(baseDir);
        const expectedDir = path.join(baseDir, '.egg', 'compile-cache');
        assert.equal(process.env.NODE_COMPILE_CACHE, expectedDir);
        assert.equal(process.env.NODE_COMPILE_CACHE_PORTABLE, '1');

        // Verify compile cache is active
        const cacheDir = module.getCompileCacheDir?.();
        assert.ok(cacheDir, 'compile cache dir should be set');

        // Load a fixture module guaranteed not to be pre-cached
        require('../fixtures/compile-cache-target/index.cjs');

        // Flush and verify cache files are generated
        ManifestStore.flushCompileCache();
        assert.ok(fs.existsSync(cacheDir), 'compile cache directory should exist');
        const entries = fs.readdirSync(cacheDir);
        assert.ok(entries.length > 0, 'compile cache should contain cache files');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should flush compile cache without error', () => {
      assert.doesNotThrow(() => {
        ManifestStore.flushCompileCache();
      });
    });

    it('should clean compile cache directory', () => {
      const baseDir = setupBaseDir();
      try {
        const cacheDir = path.join(baseDir, '.egg', 'compile-cache');
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(path.join(cacheDir, 'test.bin'), 'cached data');
        assert.ok(fs.existsSync(cacheDir));

        ManifestStore.cleanCompileCache(baseDir);
        assert.ok(!fs.existsSync(cacheDir), 'compile cache directory should be removed');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should not throw when cleaning non-existent compile cache', () => {
      assert.doesNotThrow(() => {
        ManifestStore.cleanCompileCache(tmpDir);
      });
    });

    it('clean() should also remove compile cache directory', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir);
        const cacheDir = path.join(baseDir, '.egg', 'compile-cache');
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(path.join(cacheDir, 'test.bin'), 'data');

        ManifestStore.clean(baseDir);
        assert.ok(!fs.existsSync(path.join(baseDir, '.egg', 'manifest.json')), 'manifest.json should be removed');
        assert.ok(!fs.existsSync(cacheDir), 'compile cache directory should be removed');
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });
});
