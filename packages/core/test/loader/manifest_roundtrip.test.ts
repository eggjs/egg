import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { ManifestStore } from '../../src/loader/manifest.ts';
import { createTmpDir, setupBaseDir, generateAndWrite } from './manifest_helper.ts';

let tmpDir: string;

describe('ManifestStore roundtrip: generate → write → load', () => {
  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should round-trip manifest data correctly', async () => {
    const baseDir = setupBaseDir();
    try {
      const collector = ManifestStore.createCollector(baseDir);

      // Collect some data
      collector.resolveModule(path.join(baseDir, 'some/path'), () => path.join(baseDir, 'resolved/path'));
      collector.resolveModule(path.join(baseDir, 'missing'), () => undefined);
      collector.globFiles(path.join(baseDir, 'app/controller'), () => ['home.ts', 'user.ts']);

      const teggData = { moduleReferences: [{ name: 'foo', path: '/tmp/foo' }] };
      collector.setExtension('tegg', teggData);
      const original = collector.generateManifest({
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: true,
      });
      await ManifestStore.write(baseDir, original);

      // Load and verify
      const store = ManifestStore.load(baseDir, 'prod', '')!;
      assert.ok(store);

      // resolveCache uses relative paths internally
      assert.equal(original.resolveCache['some/path'], 'resolved/path');
      assert.equal(original.resolveCache['missing'], null);
      assert.deepStrictEqual(original.fileDiscovery['app/controller'], ['home.ts', 'user.ts']);
      assert.deepStrictEqual(store.data.extensions, { tegg: teggData });
      assert.equal(store.data.version, original.version);
      assert.equal(store.data.generatedAt, original.generatedAt);

      // Loaded store converts back to absolute paths
      const resolved = store.resolveModule(path.join(baseDir, 'some/path'), () => {
        throw new Error('should not be called');
      });
      assert.equal(resolved, path.join(baseDir, 'resolved/path'));
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('should invalidate after lockfile modification', async () => {
    const baseDir = setupBaseDir({ lockfile: 'pnpm' });
    try {
      await generateAndWrite(baseDir);
      assert.ok(ManifestStore.load(baseDir, 'prod', ''));

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

  it('should match expected manifest fixture structure', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const fixturePath = path.join(currentDir, '../fixtures/manifest/expected-manifest.json');
    const expected = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    assert.equal(expected.version, 1);
    assert.ok(expected.generatedAt);
    assert.ok(expected.invalidation);
    assert.equal(expected.invalidation.serverEnv, 'prod');
    assert.equal('baseDir' in expected.invalidation, false);
    assert.ok(typeof expected.invalidation.lockfileFingerprint === 'string');
    assert.ok(typeof expected.invalidation.configFingerprint === 'string');

    // All paths in resolveCache and fileDiscovery should be relative
    for (const key of Object.keys(expected.resolveCache)) {
      assert.ok(!path.isAbsolute(key), `resolveCache key should be relative: ${key}`);
      const value = expected.resolveCache[key];
      if (value !== null) {
        assert.ok(!path.isAbsolute(value), `resolveCache value should be relative: ${value}`);
      }
    }
    for (const key of Object.keys(expected.fileDiscovery)) {
      assert.ok(!path.isAbsolute(key), `fileDiscovery key should be relative: ${key}`);
    }
  });
});
