import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import yaml from 'js-yaml';

const root = path.resolve(import.meta.dirname, '../..');
const load = (file) => yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));

test('release commands pass dispatch inputs as literal arguments', () => {
  const steps = load('.github/workflows/release.yml').jobs.release.steps;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-workflow-release-'));
  const record = path.join(fixture, 'args');
  const prereleaseTag = 'rc $(touch injected) "quoted"';
  try {
    for (const versionType of ['patch', 'prerelease']) {
      for (const dryRun of [true, false]) {
        for (const command of ['Version bump', 'Publish packages']) {
          const name = `${command}${dryRun ? ' (dry run)' : ''}`;
          const step = steps.find((entry) => entry.name === name);
          const result = spawnSync(
            'bash',
            [
              '-e',
              '-c',
              'node() { printf "%s\\0" "$@" > "$RELEASE_RECORD"; }\n' + 'git() { printf "%s\\n" v1.2.3; }\n' + step.run,
            ],
            {
              cwd: fixture,
              encoding: 'utf8',
              env: {
                ...process.env,
                RELEASE_RECORD: record,
                RELEASE_VERSION_TYPE: versionType,
                RELEASE_PRERELEASE_TAG: prereleaseTag,
                GITHUB_ENV: path.join(fixture, 'env'),
              },
            },
          );
          assert.equal(result.status, 0, `${name}: ${result.stderr}`);
          const expected =
            command === 'Version bump'
              ? ['scripts/version.js', versionType]
              : ['scripts/publish.js', `--tag=${versionType === 'patch' ? 'latest' : prereleaseTag}`];
          if (command === 'Version bump' && versionType === 'prerelease')
            expected.push(`--prerelease-tag=${prereleaseTag}`);
          if (dryRun) expected.push('--dry-run');
          if (command === 'Publish packages') {
            if (dryRun) {
              expected.push(`--version-type=${versionType}`);
              if (versionType === 'prerelease') expected.push(`--prerelease-tag=${prereleaseTag}`);
            } else {
              expected.push('--provenance');
            }
          }
          assert.deepEqual(fs.readFileSync(record, 'utf8').split('\0').slice(0, -1), expected, name);
          assert.equal(fs.existsSync(path.join(fixture, 'injected')), false);
        }
      }
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('ecosystem clone reads project names as data and writes both outputs', () => {
  const step = load('.github/actions/clone/action.yml').runs.steps[0];
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-workflow-clone-'));
  const output = path.join(fixture, 'github output');
  const project = { repository: 'https://github.com/eggjs/examples.git', hash: 'abc123' };
  try {
    fs.mkdirSync(path.join(fixture, 'ecosystem-ci'));
    for (const name of ['examples', "demo']; process.exit(1); //", 'demo$(touch injected)']) {
      fs.writeFileSync(path.join(fixture, 'ecosystem-ci/repo.json'), JSON.stringify({ [name]: project }));
      fs.writeFileSync(output, '');
      const result = spawnSync('bash', ['-e', '-c', step.run], {
        cwd: fixture,
        encoding: 'utf8',
        env: { ...process.env, ECOSYSTEM_CI_PROJECT: name, GITHUB_OUTPUT: output },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        fs.readFileSync(output, 'utf8'),
        'ECOSYSTEM_CI_PROJECT_HASH=abc123\nECOSYSTEM_CI_PROJECT_REPOSITORY=eggjs/examples\n',
      );
      assert.equal(fs.existsSync(path.join(fixture, 'injected')), false);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
