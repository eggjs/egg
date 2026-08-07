import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveLeoricSnapshotCompatibility } from '../src/compat/leoric/index.ts';
import { PackRunner } from '../src/lib/PackRunner.ts';

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TEST_BUILD_ROOT = path.join(REPO_ROOT, '.egg-bundle');

describe('Leoric snapshot loader — real @utoo/pack build', () => {
  let baseDir: string;

  beforeEach(async () => {
    await fs.mkdir(TEST_BUILD_ROOT, { recursive: true });
    baseDir = await fs.mkdtemp(path.join(TEST_BUILD_ROOT, 'leoric-loader-test-'));
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'leoric-loader-test' }));

    const mysql2Dir = path.join(baseDir, 'node_modules', 'mysql2');
    await fs.mkdir(mysql2Dir, { recursive: true });
    await fs.writeFile(path.join(mysql2Dir, 'package.json'), JSON.stringify({ name: 'mysql2', main: 'index.js' }));
    await fs.writeFile(
      path.join(mysql2Dir, 'index.js'),
      'class Pool { escape() {} escapeId() {} }\nmodule.exports = { createPool() { return new Pool(); } };\n',
    );
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('bundles Leoric core and loads the database client only after Node 24 snapshot restore', async () => {
    const entryDir = path.join(baseDir, 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    await fs.writeFile(
      entry,
      [
        '// @ts-nocheck',
        "import { startupSnapshot } from 'node:v8';",
        "import Realm from 'leoric';",
        'class SnapshotModel extends Realm.Bone {}',
        'globalThis.__leoricLoaderState = { Realm, SnapshotModel, stringTypeName: Realm.DataTypes.STRING.name };',
        'startupSnapshot.setDeserializeMainFunction(() => {',
        "  const { createRequire } = process.getBuiltinModule('node:module');",
        `  globalThis.__RUNTIME_REQUIRE = createRequire(${JSON.stringify(path.join(baseDir, 'package.json'))});`,
        '  const state = globalThis.__leoricLoaderState;',
        "  const driver = new state.Realm.MysqlDriver({ client: 'mysql2', database: 'snapshot-test' });",
        '  console.log(JSON.stringify({',
        '    modelBaseMatches: Object.getPrototypeOf(state.SnapshotModel) === state.Realm.Bone,',
        '    modelInstanceof: new state.SnapshotModel() instanceof state.Realm.Bone,',
        '    stringTypeNameMatches: state.Realm.DataTypes.STRING.name === state.stringTypeName,',
        "    mysql2PoolCreated: driver.pool?.constructor?.name === 'Pool',",
        '  }));',
        '});',
        '',
      ].join('\n'),
    );

    const outputDir = path.join(baseDir, 'output');
    const compatibility = resolveLeoricSnapshotCompatibility({
      baseDir,
      lazyModules: [],
    });
    expect(compatibility).toBeDefined();
    await new PackRunner({
      entries: [{ name: 'worker', filepath: entry }],
      outputDir,
      externals: {},
      projectPath: entryDir,
      rootPath: REPO_ROOT,
      module: compatibility!.module,
    }).run();

    const workerPath = path.join(outputDir, 'worker.js');
    const worker = await fs.readFile(workerPath, 'utf8');
    expect(worker).toContain('globalThis.__RUNTIME_REQUIRE(client)');
    expect(worker).not.toContain('require(client)');
    for (const id of ['pg', 'pg-types', 'sql.js']) {
      expect(worker).toContain(`globalThis.__RUNTIME_REQUIRE('${id}')`);
    }
    await execFileAsync(process.execPath, ['--check', workerPath]);

    if (Number(process.versions.node.split('.')[0]) < 24) return;

    const blobPath = path.join(baseDir, 'snapshot.blob');
    await execFileAsync(process.execPath, ['--snapshot-blob', blobPath, '--build-snapshot', workerPath]);
    const restored = await execFileAsync(process.execPath, ['--snapshot-blob', blobPath]);
    expect(JSON.parse(restored.stdout)).toEqual({
      modelBaseMatches: true,
      modelInstanceof: true,
      stringTypeNameMatches: true,
      mysql2PoolCreated: true,
    });
  }, 60_000);
});
