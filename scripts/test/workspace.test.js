import assert from 'node:assert/strict';
import fs from 'node:fs';
import { glob } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { generateUtooToml } from '../gen-utoo-catalog.mjs';
import { getCatalogs, getPublishablePackages, getWorkspaceVersionMap, resolveWorkspaceProtocols } from '../utils.js';

const root = path.resolve(import.meta.dirname, '../..');

test('native configuration resolves every workspace dependency without pnpm metadata', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(manifest.workspaces.length > 0);
  assert.equal(generateUtooToml(root), fs.readFileSync(path.join(root, '.utoo.toml'), 'utf8'));
  const versionMap = getWorkspaceVersionMap(root);
  const catalogs = getCatalogs(root);
  resolveWorkspaceProtocols(manifest, { versionMap, catalogs });
  let count = 0;
  for (const pattern of manifest.workspaces) {
    for await (const file of glob(`${pattern}/package.json`, { cwd: root })) {
      resolveWorkspaceProtocols(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')), { versionMap, catalogs });
      count++;
    }
  }
  assert.ok(count > 0, 'must validate real workspace manifests');
});

test('release helpers resolve native default/named catalogs and discover private workspaces', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-workspace-'));
  try {
    fs.mkdirSync(path.join(fixture, 'packages/public'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'packages/private'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'site'));
    fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ workspaces: ['packages/*', 'site'] }));
    fs.writeFileSync(
      path.join(fixture, '.utoo.toml'),
      '[catalog]\nfoo = "^1.2.3"\n[catalogs.legacy]\nbar = "~2.0.0"\n',
    );
    for (const [dir, name, isPrivate] of [
      ['packages/public', 'public', false],
      ['packages/private', 'private', true],
      ['site', 'site', true],
    ]) {
      fs.writeFileSync(
        path.join(fixture, dir, 'package.json'),
        JSON.stringify({ name, version: '1.0.0', private: isPrivate }),
      );
    }
    const versionMap = getWorkspaceVersionMap(fixture);
    assert.deepEqual(Object.keys(versionMap).sort(), ['private', 'public', 'site']);
    assert.deepEqual(
      getPublishablePackages(fixture).map((pkg) => pkg.name),
      ['public'],
    );
    const catalogs = getCatalogs(fixture);
    const resolved = resolveWorkspaceProtocols(
      { dependencies: { foo: 'catalog:', bar: 'catalog:legacy', public: 'workspace:^' } },
      { versionMap, catalogs },
    );
    assert.deepEqual(resolved.dependencies, { foo: '^1.2.3', bar: '~2.0.0', public: '^1.0.0' });
    assert.throws(
      () => resolveWorkspaceProtocols({ dependencies: { missing: 'catalog:' } }, { versionMap, catalogs }),
      /missing from default catalog/,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
