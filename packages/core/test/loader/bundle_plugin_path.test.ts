import assert from 'node:assert/strict';
import path from 'node:path';

import { afterEach, describe, it } from 'vitest';

import { EggLoader, ManifestStore } from '../../src/index.ts';
import { getFilepath } from '../helper.ts';

// Regression coverage for bundle-mode plugin path relocation.
//
// In bundle mode the bundler rewrites `import.meta.dirname` (used by
// `definePluginFactory({ path: import.meta.dirname })`) to the bundle output
// directory (= baseDir). The loader must detect that rewritten artifact and
// re-resolve the plugin to its package entry directory, rebased under the
// output `node_modules`, so the manifest-backed loader fs can find the bundled
// plugin files. Non-bundle behavior must stay byte-for-byte identical.
describe('test/loader/bundle_plugin_path.test.ts', () => {
  const baseDir = getFilepath('bundle-plugin-paths');

  function createLoader() {
    const loader = new EggLoader({
      baseDir,
      app: {},
      logger: console,
    } as any);
    // `lookupDirs` is normally populated by `loadPlugin()`; set it directly so
    // `getPluginPath` can be exercised in isolation without a full plugin load.
    (loader as any).lookupDirs = (loader as any).getLookupDirs();
    return loader;
  }

  function registerBundleStore() {
    const data = ManifestStore.createCollector(baseDir).generateManifest({
      serverEnv: 'prod',
      serverScope: '',
      typescriptEnabled: false,
    });
    ManifestStore.setBundleStore(ManifestStore.fromBundle(data, baseDir));
  }

  afterEach(() => {
    ManifestStore.setBundleStore(undefined);
  });

  describe('with a registered bundle store', () => {
    it('should re-resolve a built-in plugin declared with only a name', () => {
      registerBundleStore();
      const loader = createLoader();
      // The bundler rewrote the plugin path to the output baseDir; the plugin
      // only carries `name`, so it falls back to the `@eggjs/<name>` package.
      const resolved = (loader as any).getPluginPath({
        name: 'bundle-builtin',
        path: baseDir,
      });
      assert.equal(resolved, path.join(baseDir, 'node_modules', '@eggjs', 'bundle-builtin', 'dist'));
    });

    it('should re-resolve a plugin declared with a package name', () => {
      registerBundleStore();
      const loader = createLoader();
      const resolved = (loader as any).getPluginPath({
        name: 'bundlePluginPkg',
        package: 'bundle-plugin-pkg',
        path: baseDir,
      });
      assert.equal(resolved, path.join(baseDir, 'node_modules', 'bundle-plugin-pkg', 'dist'));
    });

    it('should keep an explicit path that is not the bundle artifact', () => {
      registerBundleStore();
      const loader = createLoader();
      // path !== baseDir => not a rewritten artifact, return verbatim.
      const explicit = path.join(baseDir, 'node_modules', 'bundle-plugin-pkg');
      const resolved = (loader as any).getPluginPath({
        name: 'bundlePluginPkg',
        path: explicit,
      });
      assert.equal(resolved, explicit);
    });
  });

  describe('with a bundle store registered for a *different* app', () => {
    it('should not treat this app’s paths as bundle artifacts', () => {
      // The bundle store is shared via globalThis across @eggjs/core copies, so a
      // store registered for another app must not redirect this app's plugin
      // resolution. Register a store whose baseDir differs from this loader's.
      const otherBaseDir = path.join(baseDir, '..', 'some-other-app');
      const data = ManifestStore.createCollector(otherBaseDir).generateManifest({
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: false,
      });
      ManifestStore.setBundleStore(ManifestStore.fromBundle(data, otherBaseDir));
      const loader = createLoader();
      // path === this app's baseDir, but the store is for another app, so the
      // artifact gate stays off and the explicit path is returned verbatim.
      assert.equal((loader as any).getPluginPath({ name: 'x', path: baseDir }), baseDir);
    });
  });

  describe('without a bundle store (non-bundle, zero behavior change)', () => {
    it('should return an explicit path verbatim, even when it equals baseDir', () => {
      const loader = createLoader();
      // Without a bundle store the artifact gate is off, so the original
      // `plugin.path` short-circuit applies unchanged.
      assert.equal((loader as any).getPluginPath({ name: 'x', path: baseDir }), baseDir);
      const other = path.join(baseDir, 'node_modules', 'bundle-plugin-pkg');
      assert.equal((loader as any).getPluginPath({ name: 'x', path: other }), other);
    });
  });
});
