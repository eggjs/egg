import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function createPlan(eventName, event, files = []) {
  const profile =
    eventName === 'pull_request' && !event.pull_request.labels.some((label) => label.name === 'ci:full')
      ? 'pr'
      : 'full';
  const docsOnly =
    eventName === 'pull_request' &&
    files.length > 0 &&
    files.length < 3000 &&
    files.every((file) => file.endsWith('.md') || file.startsWith('site/docs/') || file.startsWith('site/public/'));
  const include = [];
  for (const os of ['ubuntu-latest', 'macos-latest', 'windows-latest']) {
    for (const node of ['22', '24', '26']) {
      if (profile === 'pr' && os !== 'ubuntu-latest' && node !== '24') continue;
      const shardTotal = profile === 'pr' && !(os === 'ubuntu-latest' && node === '26') ? 2 : 1;
      for (let shardIndex = 1; shardIndex <= shardTotal; shardIndex++) {
        include.push({ os, node, coverage: os === 'ubuntu-latest' && node === '24', shardIndex, shardTotal });
      }
    }
  }
  return { profile, tests: !docsOnly, matrix: { include } };
}

export function checkResults(needs) {
  assert.equal(needs.plan?.result, 'success', 'CI planning must succeed');
  assert.equal(needs.typecheck?.result, 'success', 'Static checks must succeed');
  const tests = needs.plan.outputs.tests;
  assert.ok(tests === 'true' || tests === 'false', 'The test plan must be explicit');
  for (const name of ['test', 'coverage', 'test-egg-bin', 'test-egg-scripts', 'test-tegg-vitest']) {
    assert.equal(needs[name]?.result, tests === 'true' ? 'success' : 'skipped', `Unexpected result for ${name}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === 'check') {
    checkResults(JSON.parse(process.env.CI_NEEDS));
  } else {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    let files = [];
    if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
      // The API returns PR changes against the merge base, including renames and deletions.
      // Failure stops planning; incomplete or empty results select the full test workload.
      const output = execFileSync(
        'gh',
        [
          'api',
          '--paginate',
          `repos/${process.env.GITHUB_REPOSITORY}/pulls/${event.number}/files?per_page=100`,
          '--jq',
          '.[].filename',
        ],
        { encoding: 'utf8' },
      );
      files = output.trim().split('\n').filter(Boolean);
    }
    const plan = createPlan(process.env.GITHUB_EVENT_NAME, event, files);
    for (const [key, value] of Object.entries(plan)) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}\n`,
      );
    }
    console.log(JSON.stringify(plan, null, 2));
  }
}
