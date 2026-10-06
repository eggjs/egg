import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import yaml from 'js-yaml';

import {
  assertPublishTag,
  getPublishablePackages,
  getWorkspaceVersionMap,
  isValidNpmPackageName,
  projectPublishVersions,
} from '../utils.js';

const root = path.resolve(import.meta.dirname, '../..');
const workflow = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8'));

test('release guard requires an allowed branch and its full branch ref', () => {
  const guard = workflow.jobs.release.steps[0];
  assert.equal(guard.env.DISPATCH_REF, '${{ github.ref }}');
  for (const [branch, ref, succeeds] of [
    ['next', 'refs/heads/next', true],
    ['master', 'refs/heads/master', true],
    ['next', 'refs/tags/next', false],
    ['next', 'refs/heads/master', false],
    ['feature', 'refs/heads/feature', false],
    ['next; echo injected', 'refs/heads/next', false],
  ]) {
    const result = spawnSync('bash', ['-c', guard.run], {
      env: { ...process.env, INPUT_BRANCH: branch, DISPATCH_REF: ref },
    });
    assert.equal(result.status === 0, succeeds, `${branch} / ${ref}`);
  }
});

test('projected stable patch accepts old RC manifests without weakening real publish guards', () => {
  const packages = [
    { name: 'egg', version: '4.1.2-rc.0' },
    { name: '@eggjs/core', version: '6.2.0' },
  ];
  const map = { egg: packages[0].version, '@eggjs/core': packages[1].version, private: '1.0.0' };
  const projected = projectPublishVersions(packages, map, { dryRun: true, versionType: 'patch' });
  assert.deepEqual(
    projected.packages.map((pkg) => pkg.version),
    ['4.1.2', '6.2.1'],
  );
  assert.equal(projected.versionMap.egg, '4.1.2');
  assert.equal(map.egg, '4.1.2-rc.0');
  assertPublishTag(projected.packages, 'latest');
  assert.throws(() => assertPublishTag(packages, 'latest'), /prerelease/);
  assert.throws(
    () => projectPublishVersions(packages, map, { dryRun: false, versionType: 'patch' }),
    /requires --dry-run/,
  );
  assert.throws(
    () => projectPublishVersions(packages, map, { dryRun: true, versionType: 'invalid' }),
    /Invalid version type/,
  );
  assertPublishTag(packages, 'rc');
  const prerelease = projectPublishVersions(packages, map, {
    dryRun: true,
    versionType: 'prerelease',
    prereleaseTag: 'rc',
  });
  assert.throws(() => assertPublishTag(prerelease.packages, 'latest'), /prerelease/);
  assertPublishTag(prerelease.packages, 'rc');
});

test('package names reject shell metacharacters and validate the current publish set', () => {
  for (const name of ['egg', '@eggjs/core']) assert.equal(isValidNpmPackageName(name), true);
  for (const name of ['egg$(touch injected)', 'egg;echo x', 'UPPER', '', '@scope/', 'a'.repeat(215)])
    assert.equal(isValidNpmPackageName(name), false);
  const packages = getPublishablePackages(root);
  assertPublishTag(
    projectPublishVersions(packages, getWorkspaceVersionMap(root), { dryRun: true, versionType: 'patch' }).packages,
    'latest',
  );
});

test('publish preview packs projected manifests and dependencies, restores bytes, rejects real projection', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-release-'));
  try {
    fs.mkdirSync(path.join(fixture, 'scripts'));
    fs.mkdirSync(path.join(fixture, 'packages/egg'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'bin'));
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
    for (const file of ['publish.js', 'utils.js'])
      fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
    fs.writeFileSync(path.join(fixture, 'package.json'), '{"type":"module","workspaces":["packages/*"]}');
    fs.writeFileSync(path.join(fixture, '.utoo.toml'), '[catalog]\n');
    const manifest = '{"name":"egg","version":"4.1.2-rc.0","dependencies":{"egg":"workspace:^"}}\n';
    const manifestPath = path.join(fixture, 'packages/egg/package.json');
    fs.writeFileSync(manifestPath, manifest);
    fs.writeFileSync(
      path.join(fixture, 'bin/npm'),
      `#!/usr/bin/env node\nimport fs from 'node:fs';\nfs.appendFileSync(process.env.RELEASE_RECORD, JSON.stringify({args:process.argv.slice(2), manifest:JSON.parse(fs.readFileSync('package.json')), level:process.env.NPM_CONFIG_LOGLEVEL})+'\\n');\n`,
      { mode: 0o755 },
    );
    const record = path.join(fixture, 'record');
    const run = (args) =>
      spawnSync(process.execPath, ['scripts/publish.js', ...args], {
        cwd: fixture,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${path.join(fixture, 'bin')}${path.delimiter}${process.env.PATH}`,
          RELEASE_RECORD: record,
        },
      });
    assert.equal(run(['--tag=latest', '--dry-run']).status, 1);
    assert.equal(run(['--tag=latest', '--version-type=patch']).status, 1);
    assert.equal(fs.existsSync(record), false);
    const result = run(['--tag=latest', '--dry-run', '--version-type=patch']);
    assert.equal(result.status, 0, result.stderr);
    const packed = JSON.parse(fs.readFileSync(record, 'utf8'));
    assert.equal(packed.manifest.version, '4.1.2');
    assert.equal(packed.manifest.dependencies.egg, '^4.1.2');
    assert.ok(packed.args.includes('--dry-run'));
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), manifest);
    fs.rmSync(record);
    fs.writeFileSync(path.join(fixture, 'bin/npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    assert.equal(run(['--tag=latest', '--dry-run', '--version-type=patch']).status, 1);
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), manifest);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('version commit message and tag are passed as git argv', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-version-'));
  try {
    fs.mkdirSync(path.join(fixture, 'scripts'));
    fs.mkdirSync(path.join(fixture, 'packages/egg'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'bin'));
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
    for (const file of ['version.js', 'utils.js'])
      fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
    fs.writeFileSync(
      path.join(fixture, 'package.json'),
      '{"type":"module","version":"4.1.2-rc.0","workspaces":["packages/*"]}',
    );
    fs.writeFileSync(path.join(fixture, '.utoo.toml'), '[catalog]\n');
    fs.writeFileSync(path.join(fixture, 'packages/egg/package.json'), '{"name":"egg","version":"4.1.2-rc.0"}');
    fs.writeFileSync(
      path.join(fixture, 'bin/git'),
      `#!/usr/bin/env node\nimport fs from 'node:fs';\nfs.appendFileSync(process.env.RELEASE_RECORD, JSON.stringify(process.argv.slice(2))+'\\n');\n`,
      { mode: 0o755 },
    );
    const record = path.join(fixture, 'record');
    const result = spawnSync(process.execPath, ['scripts/version.js', 'patch'], {
      cwd: fixture,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${path.join(fixture, 'bin')}${path.delimiter}${process.env.PATH}`,
        RELEASE_RECORD: record,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const calls = fs
      .readFileSync(record, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.deepEqual(calls, [
      ['status', '--porcelain'],
      ['add', '.'],
      ['commit', '-m', 'chore(release): patch version bump\n\n- egg@4.1.2'],
      ['tag', 'v4.1.2'],
    ]);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
