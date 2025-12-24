import assert from 'node:assert/strict';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { ModelInfoUtil } from '../src/index.ts';
import { Foo } from './fixtures/Foo.ts';

describe('test/decorator.test.ts', () => {
  it('should work', () => {
    const attributes = ModelInfoUtil.getModelAttributes(Foo);
    const indices = ModelInfoUtil.getModelIndices(Foo);
    const tableName = ModelInfoUtil.getTableName(Foo);
    const dataSource = ModelInfoUtil.getDataSource(Foo);
    assert.deepStrictEqual(
      attributes,
      new Map([
        [
          'id',
          {
            dataType: 'int',
            options: {
              name: 'pid',
              allowNull: false,
              autoIncrement: true,
              primary: true,
            },
          },
        ],
        [
          'name',
          {
            dataType: 'varchar(20)',
            options: undefined,
          },
        ],
        [
          'foo',
          {
            dataType: 'varchar(20)',
            options: { unique: true },
          },
        ],
      ]),
    );
    assert.deepStrictEqual(indices, [
      {
        fields: ['name'],
        options: { unique: true },
      },
    ]);
    assert.equal(tableName, 'a_foo_table');
    assert.equal(dataSource, 'a_db');
  });
});
