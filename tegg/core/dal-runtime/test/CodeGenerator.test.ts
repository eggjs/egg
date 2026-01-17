import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { TableModel } from '@eggjs/dal-decorator';
import { describe, it } from 'vite-plus/test';

import { CodeGenerator } from '../src/CodeGenerator.js';
import { Foo } from './fixtures/modules/generate_codes/Foo.js';
import { MultiPrimaryKey } from './fixtures/modules/generate_codes/MultiPrimaryKey.js';

describe('test/CodeGenerator.test.ts', () => {
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
