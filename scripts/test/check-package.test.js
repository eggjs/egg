import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkPackage } from '../check-package.mjs';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-publint-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const manifestPath = path.join(directory, 'package.json');
  const original = JSON.stringify({
    name: '@eggjs/test',
    version: '1.0.0',
    exports: './src/index.ts',
    publishConfig: { exports: './dist/index.js', access: 'public' },
    dependencies: { egg: 'workspace:*', typescript: 'catalog:' },
  });
  await fs.writeFile(manifestPath, original);
  return { manifestPath, original, tarballPath: path.join(directory, 'eggjs-test-1.0.0.tgz') };
}

const protocols = { versionMap: { egg: '4.1.2' }, catalogs: { default: { typescript: '^5.9.3' }, named: {} } };

test('checks the published tarball and restores the source manifest', async (t) => {
  const f = await fixture(t);
  await checkPackage(f.manifestPath, {
    protocols,
    pack: async (directory) => {
      const m = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
      assert.equal(m.exports, './dist/index.js');
      assert.equal(m.dependencies.egg, '4.1.2');
      assert.equal(m.dependencies.typescript, '^5.9.3');
      await fs.writeFile(path.join(directory, 'eggjs-test-1.0.0.tgz'), 'tarball');
    },
    check: async (options) => {
      assert.equal(options.pack.tarball.toString(), 'tarball');
      assert.equal(options.strict, true);
      return { messages: [], pkg: {} };
    },
  });
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), f.original);
  await assert.rejects(fs.access(f.tarballPath), { code: 'ENOENT' });
});

test('a failed pack restores the manifest and removes a partial tarball', async (t) => {
  const f = await fixture(t);
  let staged;
  await assert.rejects(
    checkPackage(f.manifestPath, {
      protocols,
      pack: async (directory) => {
        staged = directory;
        await fs.writeFile(path.join(directory, 'eggjs-test-1.0.0.tgz'), 'partial');
        throw new Error('pack failed');
      },
    }),
    /pack failed/,
  );
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), f.original);
  await assert.rejects(fs.access(staged), { code: 'ENOENT' });
});

test('leaves an existing source tarball untouched', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.tarballPath, 'existing');
  await checkPackage(f.manifestPath, {
    protocols,
    pack: async (directory) => fs.writeFile(path.join(directory, 'eggjs-test-1.0.0.tgz'), 'new'),
    check: async () => ({ messages: [], pkg: {} }),
  });
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), f.original);
  assert.equal(await fs.readFile(f.tarballPath, 'utf8'), 'existing');
});

test('propagates validation failure and removes the staged package', async (t) => {
  const f = await fixture(t);
  let staged;
  await assert.rejects(
    checkPackage(f.manifestPath, {
      protocols,
      pack: async (directory) => {
        staged = directory;
        await fs.writeFile(path.join(directory, 'eggjs-test-1.0.0.tgz'), 'new');
      },
      check: async () => {
        throw new Error('validation failed');
      },
    }),
    /validation failed/,
  );
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), f.original);
  await assert.rejects(fs.access(staged), { code: 'ENOENT' });
});
