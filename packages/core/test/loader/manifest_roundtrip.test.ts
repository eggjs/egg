import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
