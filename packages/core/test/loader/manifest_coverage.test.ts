import assert from 'node:assert/strict';
import path from 'node:path';

import { describe, it, afterAll } from 'vitest';

import { createApp, getFilepath, type Application } from '../helper.js';

describe('ManifestStore coverage: FileLoader getter auto-injects manifest', () => {
  let app: Application;

  afterAll(() => app?.close());

  it('should collect fileDiscovery when plugin uses app.loader.FileLoader', async () => {
    app = createApp('middleware-override');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadCustomApp();
    await app.loader.loadMiddleware();
    await app.loader.loadController();
    await app.loader.loadRouter();

    const manifest = app.loader.generateManifest();

    // resolveCache should contain resolved files (extend files, router, configs, boot hooks)
    assert.ok(Object.keys(manifest.resolveCache).length > 0, 'resolveCache should have entries');

    // fileDiscovery should contain directory scans from middleware, controller loading
    assert.ok(Object.keys(manifest.fileDiscovery).length > 0, 'fileDiscovery should have entries');

    // All resolveCache keys should be relative paths
    for (const key of Object.keys(manifest.resolveCache)) {
      assert.ok(!path.isAbsolute(key), `resolveCache key should be relative: ${key}`);
      const value = manifest.resolveCache[key];
      if (value !== null) {
        assert.ok(!path.isAbsolute(value), `resolveCache value should be relative: ${value}`);
      }
    }

    // All fileDiscovery keys should be relative paths
    for (const key of Object.keys(manifest.fileDiscovery)) {
      assert.ok(!path.isAbsolute(key), `fileDiscovery key should be relative: ${key}`);
    }
  });

  it('should auto-inject manifest into FileLoader created via app.loader.FileLoader', async () => {
    const testApp = createApp('context-loader');
    await testApp.loader.loadPlugin();
    await testApp.loader.loadConfig();
    await testApp.loader.loadCustomApp();

    // Use app.loader.FileLoader (the getter) to create a loader like plugins do
    const CustomLoader = testApp.loader.FileLoader;
    const target = {};
    const directory = getFilepath('context-loader/app/service');
    const loader = new CustomLoader({
      directory,
      target,
      inject: testApp,
    });
    await loader.load();

    // Generate manifest and verify fileDiscovery captured the directory scan
    const manifest = testApp.loader.generateManifest();
    const relDir = path.relative(testApp.loader.options.baseDir, directory).replaceAll(path.sep, '/');

    assert.ok(
      relDir in manifest.fileDiscovery,
      `fileDiscovery should contain '${relDir}', got keys: ${Object.keys(manifest.fileDiscovery).join(', ')}`,
    );
    assert.ok(Array.isArray(manifest.fileDiscovery[relDir]));
    assert.ok(manifest.fileDiscovery[relDir].length > 0, 'fileDiscovery should have files');

    await testApp.close();
  });

  it('should auto-inject manifest into ContextLoader created via app.loader.ContextLoader', async () => {
    const testApp = createApp('context-loader');
    await testApp.loader.loadPlugin();
    await testApp.loader.loadConfig();
    await testApp.loader.loadCustomApp();

    // Use app.loader.ContextLoader (the getter)
    const CustomContextLoader = testApp.loader.ContextLoader;
    const directory = getFilepath('context-loader/app/service');
    const loader = new CustomContextLoader({
      directory,
      property: 'testService',
      inject: testApp,
    });
    await loader.load();

    // Generate manifest and verify fileDiscovery captured the directory scan
    const manifest = testApp.loader.generateManifest();
    const relDir = path.relative(testApp.loader.options.baseDir, directory).replaceAll(path.sep, '/');

    assert.ok(
      relDir in manifest.fileDiscovery,
      `fileDiscovery should contain '${relDir}', got keys: ${Object.keys(manifest.fileDiscovery).join(', ')}`,
    );

    await testApp.close();
  });
});
