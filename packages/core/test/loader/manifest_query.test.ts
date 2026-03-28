import assert from 'node:assert/strict';
import fs from 'node:fs';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { ManifestStore } from '../../src/loader/manifest.ts';
import { createTmpDir, setupBaseDir, generateAndWrite } from './manifest_helper.ts';

let tmpDir: string;

describe('ManifestStore query APIs', () => {
  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getResolveCache()', () => {
    it('should return cached path', async () => {
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

    it('should return null for null-cached entry', async () => {
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

    it('should return undefined for uncached entry', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, { resolveCache: {} });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getResolveCache('/not/in/cache'), undefined);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('getFileDiscovery()', () => {
    it('should return cached file list', async () => {
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

    it('should return undefined for uncached directory', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, { fileDiscovery: {} });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getFileDiscovery('/not/cached'), undefined);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });

  describe('tegg getter', () => {
    it('should return tegg data', async () => {
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
});
