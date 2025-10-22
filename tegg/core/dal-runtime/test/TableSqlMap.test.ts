import assert from 'node:assert';

import { describe, it } from 'vitest';
import { TableModel } from '@eggjs/dal-decorator';

import { Foo } from './fixtures/modules/dal/Foo.js';
import { SqlMapLoader } from '../src/SqlMapLoader.ts';
import { BaseFooDAO } from './fixtures/modules/dal/dal/dao/base/BaseFooDAO.js';

describe('test/TableSqlMap.test.ts', () => {
  it('custom sql should work', () => {
    // const generator = new SqlGenerator();
    const fooModel = TableModel.build(Foo);
    // const sql = generator.generate(fooModel);
    const sqlMapLoader = new SqlMapLoader(fooModel, BaseFooDAO, console);
    const tableSqlMap = sqlMapLoader.load();
    const sql = tableSqlMap.generate('findAll', {}, 'UTC');
    assert.equal(
      sql,
      'SELECT `id`,`name`,`col1`,`bit_column`,`bool_column`,`tiny_int_column`,`small_int_column`,`medium_int_column`,`int_column`,`big_int_column`,`decimal_column`,`float_column`,`double_column`,`date_column`,`date_time_column`,`timestamp_column`,`time_column`,`year_column`,`var_char_column`,`binary_column`,`var_binary_column`,`tiny_blob_column`,`tiny_text_column`,`blob_column`,`text_column`,`medium_blob_column`,`long_blob_column`,`medium_text_column`,`long_text_column`,`enum_column`,`set_column`,`geometry_column`,`point_column`,`line_string_column`,`polygon_column`,`multipoint_column`,`multi_line_string_column`,`multi_polygon_column`,`geometry_collection_column`,`json_column` from egg_foo;',
    );
  });
});
