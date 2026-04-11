import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { FileLoader, ManifestStore, type StartupManifest } from '@eggjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// T13 verifies the core contract that egg-bundler's deployment story rests on:
// a bundled app that registered a StartupManifest via `ManifestStore.setBundleStore`
// must NOT perform directory scans at boot. We validate this at two layers:
//
//   1. ManifestStore.load short-circuits to the registered bundle store, bypassing
//      disk reads entirely (positive evidence).
//   2. ManifestStore.globFiles and FileLoader both skip their fallback globber
//      whenever the directory is present in `fileDiscovery` (negative evidence).
//
// Full end-to-end verification inside a spawned bundled worker is deferred to T16
// (cnpmcore E2E), since spawning egg with workspace dev links hits the strip-types
// blocker documented in T0.

const FROZEN_INVALIDATION = {
  lockfileFingerprint: 't13-fixture',
  configFingerprint: 't13-fixture',
  serverEnv: 'prod',
  serverScope: '',
  typescriptEnabled: true,
} as const;

function makeManifest(fileDiscovery: Record<string, string[]>): StartupManifest {
  return {
    version: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    invalidation: { ...FROZEN_INVALIDATION },
    extensions: {},
    resolveCache: {},
    fileDiscovery,
  };
}

describe('no filesystem scan contract (T13)', () => {
  let tmpDir: string;
  let controllerDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-no-scan-'));
    // macOS tmpdir is a symlink (/var → /private/var). Resolve so the path
    // the test uses matches the path FileLoader sees when it computes
    // path.relative(baseDir, directory).
    tmpDir = await fs.realpath(tmpDir);
    controllerDir = path.join(tmpDir, 'app', 'controller');
    await fs.mkdir(controllerDir, { recursive: true });
    // Two files on disk: only `home.js` is in the manifest.
    // If anything scans the directory we'll see `extra.js` leak through.
    await fs.writeFile(path.join(controllerDir, 'home.js'), 'module.exports = class Home {};\n');
    await fs.writeFile(path.join(controllerDir, 'extra.js'), 'module.exports = class Extra {};\n');
    ManifestStore.setBundleStore(undefined);
  });

  afterEach(async () => {
    ManifestStore.setBundleStore(undefined);
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('ManifestStore.setBundleStore (positive — registered bundle store wins)', () => {
    it('ManifestStore.load returns the registered bundle store without any disk read', () => {
      const store = ManifestStore.fromBundle(makeManifest({ 'app/controller': ['home.js'] }), tmpDir);
      ManifestStore.setBundleStore(store);

      // `tmpDir` has no `.egg/manifest.json`. Without the bundle store, load()
      // would return null. With the bundle store, it returns the exact instance
      // we registered — proving the load path never touched fs.
      const loaded = ManifestStore.load(tmpDir, 'prod', '');
      expect(loaded).toBe(store);
      expect(ManifestStore.getBundleStore()).toBe(store);
    });

    it('ManifestStore.load without a registered bundle store returns null in prod when no .egg/manifest.json exists (control)', () => {
      // Baseline: fresh tmp dir, no bundle store, no disk manifest → null.
      // This is what proves the previous test is actually exercising the short-circuit.
      expect(ManifestStore.getBundleStore()).toBeUndefined();
      expect(ManifestStore.load(tmpDir, 'prod', '')).toBeNull();
    });
  });

  describe('ManifestStore.globFiles (contract — fallback only runs on cache miss)', () => {
    it('skips the fallback globber when fileDiscovery has the directory cached', () => {
      const store = ManifestStore.fromBundle(makeManifest({ 'app/controller': ['home.js'] }), tmpDir);
      const fallback = vi.fn<() => string[]>(() => {
        throw new Error('fallback must not be called when manifest hits cache');
      });

      const result = store.globFiles(controllerDir, fallback);

      expect(fallback).not.toHaveBeenCalled();
      expect(result).toEqual(['home.js']);
    });

    it('invokes the fallback globber on cache miss (control — proves the test is discriminating)', () => {
      const store = ManifestStore.fromBundle(makeManifest({}), tmpDir);
      const fallback = vi.fn<() => string[]>(() => ['home.js']);

      const result = store.globFiles(controllerDir, fallback);

      expect(fallback).toHaveBeenCalledTimes(1);
      expect(result).toEqual(['home.js']);
    });
  });

  describe('FileLoader end-to-end (bundled manifest really replaces disk scan)', () => {
    it('loads only files listed in fileDiscovery, ignoring extras on disk', async () => {
      const store = ManifestStore.fromBundle(makeManifest({ 'app/controller': ['home.js'] }), tmpDir);
      const target: Record<string, unknown> = {};
      const loader = new FileLoader({
        directory: controllerDir,
        target,
        manifest: store,
      });
      await loader.load();

      // `home.js` is loaded because it's in fileDiscovery.
      // `extra.js` exists on disk but is NOT in fileDiscovery, so if the loader
      // short-circuits globby correctly, it will never appear on `target`.
      expect(Object.keys(target)).toEqual(['home']);
      expect(target.home).toBeTypeOf('function');
    });

    it('without a manifest, FileLoader scans the directory and picks up both files (control)', async () => {
      const target: Record<string, unknown> = {};
      const loader = new FileLoader({
        directory: controllerDir,
        target,
      });
      await loader.load();

      // No manifest → globby scan → both files loaded. This proves the previous
      // test's exclusion of `extra.js` is due to the manifest, not a bug in the
      // fixture.
      expect(Object.keys(target).sort()).toEqual(['extra', 'home']);
    });

    it('still uses the manifest cache even when an unrelated directory on disk would also match', async () => {
      // Defense-in-depth: add a second directory the fileDiscovery does NOT
      // mention. The loader should quietly ignore it — the only directory it
      // asks globFiles about is `controllerDir`, and that one is cached.
      const orphanDir = path.join(tmpDir, 'app', 'orphan');
      await fs.mkdir(orphanDir, { recursive: true });
      await fs.writeFile(path.join(orphanDir, 'ghost.js'), 'module.exports = class Ghost {};\n');

      const store = ManifestStore.fromBundle(makeManifest({ 'app/controller': ['home.js'] }), tmpDir);
      const target: Record<string, unknown> = {};
      const loader = new FileLoader({
        directory: controllerDir,
        target,
        manifest: store,
      });
      await loader.load();

      expect(Object.keys(target)).toEqual(['home']);
    });
  });
});
