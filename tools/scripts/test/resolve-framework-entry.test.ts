import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { resolveFrameworkEntry } from '../src/commands/snapshot-build.ts';

describe('test/resolve-framework-entry.test.ts', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-resolve-fw-'));
  });
  afterEach(async () => {
    await fs.rm(tmpRoot, { force: true, recursive: true });
  });

  async function writePkg(dir: string, pkg: Record<string, unknown>) {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  async function touch(file: string) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, '');
  }

  it('prefers src/index.ts in worktree layout', async () => {
    const fw = path.join(tmpRoot, 'worktree-egg');
    await writePkg(fw, { name: 'egg', main: 'dist/index.js' });
    await touch(path.join(fw, 'src/index.ts'));
    await touch(path.join(fw, 'dist/index.js'));

    const r = resolveFrameworkEntry(fw);
    assert.equal(r.entryPath, path.join(fw, 'src/index.ts'));
    assert.ok(r.registryKeys.includes(fw));
    assert.ok(r.registryKeys.includes(path.join(fw, 'src/index.ts')));
    assert.ok(r.registryKeys.includes(path.join(fw, 'src')));
  });

  it('resolves main field in installed CJS layout', async () => {
    const fw = path.join(tmpRoot, 'installed-cjs-egg');
    await writePkg(fw, { name: 'egg', main: 'dist/index.js' });
    await touch(path.join(fw, 'dist/index.js'));

    const r = resolveFrameworkEntry(fw);
    assert.equal(r.entryPath, path.join(fw, 'dist/index.js'));
    assert.ok(r.registryKeys.includes(fw));
    assert.ok(r.registryKeys.includes(path.join(fw, 'dist/index.js')));
    assert.ok(r.registryKeys.includes(path.join(fw, 'dist')));
  });

  it('resolves string exports["."]', async () => {
    const fw = path.join(tmpRoot, 'exports-string-egg');
    await writePkg(fw, {
      name: 'egg',
      main: 'dist/index.js',
      exports: { '.': './dist/esm/index.js' },
    });
    await touch(path.join(fw, 'dist/esm/index.js'));

    const r = resolveFrameworkEntry(fw);
    assert.equal(r.entryPath, path.join(fw, 'dist/esm/index.js'));
  });

  it('resolves conditional exports (import > node > default > require)', async () => {
    const fw = path.join(tmpRoot, 'exports-conditional-egg');
    await writePkg(fw, {
      name: 'egg',
      main: 'dist/index.js',
      exports: {
        '.': {
          import: './dist/esm/index.js',
          require: './dist/cjs/index.js',
          default: './dist/index.js',
        },
      },
    });
    await touch(path.join(fw, 'dist/esm/index.js'));

    const r = resolveFrameworkEntry(fw);
    assert.equal(r.entryPath, path.join(fw, 'dist/esm/index.js'));
  });

  it('resolves nested conditional exports', async () => {
    const fw = path.join(tmpRoot, 'exports-nested-egg');
    await writePkg(fw, {
      name: 'egg',
      exports: {
        '.': {
          node: {
            import: './dist/esm/index.js',
            require: './dist/cjs/index.js',
          },
          default: './dist/index.js',
        },
      },
    });
    await touch(path.join(fw, 'dist/esm/index.js'));

    const r = resolveFrameworkEntry(fw);
    assert.equal(r.entryPath, path.join(fw, 'dist/esm/index.js'));
  });

  it('throws when resolved entry does not exist', async () => {
    const fw = path.join(tmpRoot, 'broken-egg');
    await writePkg(fw, { name: 'egg', main: 'dist/index.js' });
    // dist/index.js intentionally absent

    assert.throws(() => resolveFrameworkEntry(fw), /Framework entry not found/);
  });

  it('falls back to index.js when no main/exports', async () => {
    const fw = path.join(tmpRoot, 'no-main-egg');
    await writePkg(fw, { name: 'egg' });
    await touch(path.join(fw, 'index.js'));

    const r = resolveFrameworkEntry(fw);
    assert.equal(r.entryPath, path.join(fw, 'index.js'));
  });
});
