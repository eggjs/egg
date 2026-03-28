import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { ManifestStore } from '../../src/loader/manifest.ts';
import { createTmpDir, setupBaseDir } from './manifest_helper.ts';

let tmpDir: string;

describe('ManifestStore fingerprint stability', () => {
  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should produce same fingerprint for unchanged file', () => {
    fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'hello');
    const m1 = ManifestStore.generate({ baseDir: tmpDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
    const m2 = ManifestStore.generate({ baseDir: tmpDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
    assert.equal(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
  });

  it('should change config fingerprint when file is added', async () => {
    const baseDir = setupBaseDir({ configFiles: { 'a.ts': 'const a = 1;' } });
    try {
      const m1 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
      await new Promise((resolve) => setTimeout(resolve, 50));
      fs.writeFileSync(path.join(baseDir, 'config', 'b.ts'), 'const b = 2;');
      const m2 = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
      assert.notEqual(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('should change config fingerprint when file is deleted', () => {
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
    const m1 = ManifestStore.generate({ baseDir: tmpDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
    const m2 = ManifestStore.generate({ baseDir: tmpDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
    assert.equal(m1.invalidation.configFingerprint, m2.invalidation.configFingerprint);
  });

  it('should handle symlink cycles without infinite recursion', () => {
    const baseDir = setupBaseDir({ configFiles: { 'a.ts': '1' } });
    try {
      const configDir = path.join(baseDir, 'config');
      try {
        fs.symlinkSync(configDir, path.join(configDir, 'loop'));
      } catch {
        return; // Symlinks may not be supported
      }
      const manifest = ManifestStore.generate({ baseDir, serverEnv: 'prod', serverScope: '', typescriptEnabled: true });
      assert.ok(manifest.invalidation.configFingerprint);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
