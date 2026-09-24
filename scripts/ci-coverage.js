import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateShards(reports) {
  assert.ok(reports.length > 0, 'Coverage reports are missing');
  const first = reports[0];
  assert.equal(reports.length, first.shard.count, 'A coverage shard is missing');
  const indices = new Set();
  const files = new Set();
  for (const report of reports) {
    assert.equal(report.success, true, 'A coverage shard failed');
    assert.ok(report.coveredFiles > 0, 'A shard has no coverage');
    for (const key of ['commit', 'node', 'os', 'arch', 'vitest']) {
      assert.equal(report[key], first[key], `Coverage shards have different ${key}`);
    }
    assert.equal(report.shard.count, first.shard.count, 'Inconsistent shard count');
    assert.ok(report.shard.index >= 1 && report.shard.index <= first.shard.count, 'Invalid shard index');
    assert.ok(!indices.has(report.shard.index), 'Duplicate coverage shard');
    indices.add(report.shard.index);
    assert.deepEqual(report.expected, first.expected, 'Coverage inventories differ');
    for (const file of report.files) {
      assert.ok(['passed', 'skipped'].includes(file.state), `Incomplete test file: ${file.key}`);
      assert.ok(!files.has(file.key), `Test file ran in multiple shards: ${file.key}`);
      files.add(file.key);
    }
  }
  assert.deepEqual([...files].sort(), first.expected, 'Coverage shards must run every discovered test file');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination] = process.argv.slice(2);
  const directories = readdirSync(source).map((entry) => path.join(source, entry));
  const reports = directories.map((directory) =>
    JSON.parse(readFileSync(path.join(directory, 'execution.json'), 'utf8')),
  );
  validateShards(reports);
  mkdirSync(destination, { recursive: true });
  for (let index = 0; index < directories.length; index++) {
    copyFileSync(
      path.join(directories[index], 'blob.json'),
      path.join(destination, `shard-${reports[index].shard.index}.json`),
    );
  }
  console.log(`Verified ${reports.length} coverage shards and ${reports[0].expected.length} test files`);
}
