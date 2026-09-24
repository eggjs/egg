import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateShards } from '../ci-coverage.js';
import { checkResults, createPlan } from '../ci-plan.js';

const pr = { pull_request: { labels: [] } };

await test('PR shards preserve all Node versions and operating systems', () => {
  const plan = createPlan('pull_request', pr, ['packages/egg/src/index.ts']);
  assert.equal(plan.tests, true);
  assert.equal(plan.matrix.include.length, 9);
  assert.deepEqual(
    [...new Set(plan.matrix.include.map(({ os, node }) => `${os}/${node}`))],
    ['ubuntu-latest/22', 'ubuntu-latest/24', 'ubuntu-latest/26', 'macos-latest/24', 'windows-latest/24'],
  );
  assert.equal(plan.matrix.include.filter((entry) => entry.coverage).length, 2);
});

await test('merge queue, branch pushes, manual runs and full PRs retain the complete matrix', () => {
  for (const [eventName, event] of [
    ['merge_group', {}],
    ['push', {}],
    ['workflow_dispatch', {}],
    ['pull_request', { pull_request: { labels: [{ name: 'ci:full' }] } }],
  ]) {
    const plan = createPlan(eventName, event, ['README.md', 'package.json']);
    assert.equal(plan.tests, true);
    assert.equal(plan.matrix.include.length, 9);
    assert.ok(plan.matrix.include.every((entry) => entry.shardTotal === 1));
    assert.equal(new Set(plan.matrix.include.map(({ os, node }) => `${os}/${node}`)).size, 9);
  }
});

await test('only known documentation changes can skip tests', () => {
  assert.equal(createPlan('pull_request', pr, ['README.md', 'site/docs/index.md']).tests, false);
  for (const files of [
    [],
    ['site/package.json'],
    ['unknown'],
    ['README.md', 'vitest.config.ts'],
    Array(3000).fill('README.md'),
  ]) {
    assert.equal(createPlan('pull_request', pr, files).tests, true);
  }
});

await test('the final gate rejects failed, cancelled, missing and unexpectedly skipped work', () => {
  const names = ['test', 'coverage', 'test-egg-bin', 'test-egg-scripts', 'test-tegg-vitest', 'typecheck'];
  const needs = Object.fromEntries(names.map((name) => [name, { result: 'success' }]));
  needs.plan = { result: 'success', outputs: { tests: 'true' } };
  checkResults(needs);
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
    assert.throws(() => checkResults({ ...needs, test: { result } }));
  }
  assert.throws(() => checkResults({ ...needs, plan: { result: 'failure' } }));
  for (const name of names.filter((name) => name !== 'typecheck')) needs[name].result = 'skipped';
  needs.plan.outputs.tests = 'false';
  checkResults(needs);
});

await test('coverage requires a complete, disjoint inventory from successful matching shards', () => {
  const base = {
    success: true,
    coveredFiles: 1,
    commit: 'sha',
    node: 'v24',
    os: 'linux',
    arch: 'x64',
    vitest: '5',
    expected: ['a', 'b'],
  };
  const reports = [
    { ...base, shard: { index: 1, count: 2 }, files: [{ key: 'a', state: 'passed' }] },
    { ...base, shard: { index: 2, count: 2 }, files: [{ key: 'b', state: 'skipped' }] },
  ];
  validateShards(reports);
  assert.throws(() => validateShards([]));
  assert.throws(() => validateShards(reports.slice(0, 1)));
  for (const override of [
    { success: false },
    { coveredFiles: 0 },
    { commit: 'different' },
    { shard: { index: 1, count: 2 } },
    { files: [] },
    { files: [{ key: 'a', state: 'passed' }] },
    { files: [{ key: 'b', state: 'pending' }] },
  ])
    assert.throws(() => validateShards([reports[0], { ...reports[1], ...override }]));
});
