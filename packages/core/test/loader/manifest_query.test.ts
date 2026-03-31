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

  describe('getExtension()', () => {
    it('should return extension data by name', async () => {
      const baseDir = setupBaseDir();
      const extensions = { tegg: { moduleReferences: [{ name: 'myModule', path: '/tmp/myModule' }] } };
      try {
        await generateAndWrite(baseDir, { extensions });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.deepStrictEqual(store.getExtension('tegg'), extensions.tegg);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    it('should return undefined for unknown extension', async () => {
      const baseDir = setupBaseDir();
      try {
        await generateAndWrite(baseDir, { extensions: {} });
        const store = ManifestStore.load(baseDir, 'prod', '')!;
        assert.equal(store.getExtension('nonexistent'), undefined);
      } finally {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });
  });
});
