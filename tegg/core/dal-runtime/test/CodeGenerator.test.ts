import assert from 'node:assert';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { TableModel } from '@eggjs/dal-decorator';
import { describe, it } from 'vitest';

import { CodeGenerator } from '../src/CodeGenerator.js';
import { Foo } from './fixtures/modules/generate_codes/Foo.js';
import { MultiPrimaryKey } from './fixtures/modules/generate_codes/MultiPrimaryKey.js';

const execFileAsync = promisify(execFile);

describe('test/CodeGenerator.test.ts', () => {
  it('should load templates under native ESM runtime', async () => {
    const repoDir = path.resolve(__dirname, '../../../..');
    const moduleDir = path.join(__dirname, './fixtures/modules/generate_codes');
    const codeGeneratorUrl = pathToFileURL(path.join(__dirname, '../src/CodeGenerator.ts')).href;
    const script = `
import assert from 'node:assert/strict';
import path from 'node:path';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { ColumnModel, TableModel } from '@eggjs/dal-decorator';
import { ColumnType, Templates } from '@eggjs/tegg-types';
import { CodeGenerator } from ${JSON.stringify(codeGeneratorUrl)};

class Foo {}
PrototypeUtil.setFilePath(Foo, path.join(${JSON.stringify(moduleDir)}, 'Foo.ts'));

const generator = new CodeGenerator({
  moduleDir: ${JSON.stringify(moduleDir)},
  moduleName: 'dal',
  dalPkg: '@eggjs/dal-decorator',
});
const tableModel = new TableModel({
  clazz: Foo,
  name: 'egg_foo',
  dataSourceName: 'default',
  columns: [
    new ColumnModel({
      columnName: 'id',
      propertyName: 'id',
      type: { type: ColumnType.INT },
      canNull: false,
      primaryKey: true,
    }),
  ],
  indices: [],
});
const code = generator.genCode(
  Templates.DAO,
  path.join(${JSON.stringify(moduleDir)}, 'dal/dao/FooDAO.ts'),
  tableModel,
);
assert.match(code, /class FooDAO extends BaseFooDAO/);
`;
    const env = { ...process.env };
    delete env.NODE_OPTIONS;

    await execFileAsync(process.execPath, ['--import=tsx/esm', '--input-type=module', '-e', script], {
      cwd: repoDir,
      env,
    });
  });

  it('BaseDao should work', async () => {
    const generator = new CodeGenerator({
      moduleDir: path.join(__dirname, './fixtures/modules/generate_codes'),
      moduleName: 'dal',
      dalPkg: '@eggjs/dal-decorator',
    });
    const fooModel = TableModel.build(Foo);
    await generator.generate(fooModel);

    const multiPrimaryKeyTableModel = TableModel.build(MultiPrimaryKey);
    await generator.generate(multiPrimaryKeyTableModel);
    assert(fooModel);
  });

  it('should not overwrite Dao file', async () => {
    const generator = new CodeGenerator({
      moduleDir: path.join(__dirname, './fixtures/modules/generate_codes_not_overwrite_dao'),
      moduleName: 'dal',
      dalPkg: '@eggjs/dal-decorator',
    });
    const fooModel = TableModel.build(Foo);
    await generator.generate(fooModel);

    const multiPrimaryKeyTableModel = TableModel.build(MultiPrimaryKey);
    await generator.generate(multiPrimaryKeyTableModel);
    const daoFile = await fs.readFile(
      path.join(__dirname, './fixtures/modules/generate_codes_not_overwrite_dao/dal/dao/FooDAO.ts'),
      'utf8',
    );
    assert(/customFind/.test(daoFile));

    const extensionFile = await fs.readFile(
      path.join(__dirname, './fixtures/modules/generate_codes_not_overwrite_dao/dal/extension/FooExtension.ts'),
      'utf8',
    );
    assert(/customFind/.test(extensionFile));
  });

  it('should generate to src first', async () => {
    const generator = new CodeGenerator({
      moduleDir: path.join(__dirname, './fixtures/modules/generate_codes_to_src'),
      moduleName: 'dal',
      dalPkg: '@eggjs/dal-decorator',
    });
    const fooModel = TableModel.build(Foo);
    await generator.generate(fooModel);

    const daoFile = await fs.readFile(
      path.join(__dirname, './fixtures/modules/generate_codes_to_src/src/dal/dao/FooDAO.ts'),
      'utf8',
    );
    assert(daoFile);
  });
});
