import assert from 'node:assert';

import { describe, it } from 'vitest';
import { TableModel } from '@eggjs/dal-decorator';

import { SqlGenerator } from '../src/index.ts';
import { Foo } from './fixtures/modules/dal/Foo.js';
import { AutoUpdateTime } from './fixtures/modules/dal/AutoUpdateTime.js';
import { FooIndexName } from './fixtures/modules/dal/FooIndexName.js';

describe('test/SqlGenerator.test.ts', () => {
  it('generator should work', () => {
    const generator = new SqlGenerator();
    const fooModel = TableModel.build(Foo);
    const sql = generator.generate(fooModel);
    assert.equal(
      sql,
      'CREATE TABLE IF NOT EXISTS egg_foo (\n' +
        "  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'the primary key',\n" +
        '  name VARCHAR(100) NOT NULL UNIQUE KEY,\n' +
        '  col1 VARCHAR(100) NOT NULL,\n' +
        '  bit_column BIT(10) NOT NULL,\n' +
        '  bool_column BOOL NOT NULL,\n' +
        '  tiny_int_column TINYINT(5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  small_int_column SMALLINT(5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  medium_int_column MEDIUMINT(5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  int_column INT(5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  big_int_column BIGINT(5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  decimal_column DECIMAL(10,5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  float_column FLOAT(10,5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  double_column DOUBLE(10,5) UNSIGNED ZEROFILL NOT NULL,\n' +
        '  date_column DATE NOT NULL,\n' +
        '  date_time_column DATETIME(3) NOT NULL,\n' +
        '  timestamp_column TIMESTAMP(3) NULL,\n' +
        '  time_column TIME(3) NOT NULL,\n' +
        '  year_column YEAR NOT NULL,\n' +
        '  var_char_column VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n' +
        '  binary_column BINARY NOT NULL,\n' +
        '  var_binary_column VARBINARY(100) NOT NULL,\n' +
        '  tiny_blob_column TINYBLOB NOT NULL,\n' +
        '  tiny_text_column TINYTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n' +
        '  blob_column BLOB(100) NOT NULL,\n' +
        '  text_column TEXT(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n' +
        '  medium_blob_column MEDIUMBLOB NOT NULL,\n' +
        '  long_blob_column LONGBLOB NOT NULL,\n' +
        '  medium_text_column MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n' +
        '  long_text_column LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n' +
        "  enum_column ENUM('A','B') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n" +
        "  set_column SET('A','B') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n" +
        '  geometry_column GEOMETRY NOT NULL,\n' +
        '  point_column POINT NOT NULL,\n' +
        '  line_string_column LINESTRING NOT NULL,\n' +
        '  polygon_column POLYGON NOT NULL,\n' +
        '  multipoint_column MULTIPOINT NOT NULL,\n' +
        '  multi_line_string_column MULTILINESTRING NOT NULL,\n' +
        '  multi_polygon_column MULTIPOLYGON NOT NULL,\n' +
        '  geometry_collection_column GEOMETRYCOLLECTION NOT NULL,\n' +
        '  json_column JSON NOT NULL,\n' +
        "  FULLTEXT KEY idx_col1 (col1) COMMENT 'index comment\\n',\n" +
        "  UNIQUE KEY uk_name_col1 (name,col1) USING BTREE COMMENT 'index comment\\n'\n" +
        ") DEFAULT CHARACTER SET utf8mb4, DEFAULT COLLATE utf8mb4_unicode_ci, COMMENT='foo table';"
    );
  });

  it('generator auto update should work', () => {
    const generator = new SqlGenerator();
    const autoUpdateTimeTableModel = TableModel.build(AutoUpdateTime);
    const sql = generator.generate(autoUpdateTimeTableModel);
    assert.equal(
      sql,
      'CREATE TABLE IF NOT EXISTS auto_update_times (\n' +
        "  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'the primary key',\n" +
        '  date DATETIME ON UPDATE CURRENT_TIMESTAMP NOT NULL UNIQUE KEY,\n' +
        '  date_2 DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3) NOT NULL UNIQUE KEY,\n' +
        '  date_3 TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL UNIQUE KEY,\n' +
        '  date_4 TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) NOT NULL UNIQUE KEY\n' +
        ') ;'
    );
  });

  it('generator index name should work', () => {
    const generator = new SqlGenerator();
    const fooIndexNameTableModel = TableModel.build(FooIndexName);
    const sql = generator.generate(fooIndexNameTableModel);
    assert.equal(
      sql,
      'CREATE TABLE IF NOT EXISTS egg_foo (\n' +
        "  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'the primary key',\n" +
        '  name VARCHAR(100) NOT NULL UNIQUE KEY,\n' +
        '  col1 VARCHAR(100) NOT NULL,\n' +
        '  bit_column BIT(10) NOT NULL,\n' +
        '  bool_column BOOL NOT NULL,\n' +
        "  FULLTEXT KEY idx_col1_bool_column (col1,bool_column) COMMENT 'index comment\\n',\n" +
        "  UNIQUE KEY uk_name_col1_bit_column (name,col1,bit_column) USING BTREE COMMENT 'index comment\\n'\n" +
        ") DEFAULT CHARACTER SET utf8mb4, DEFAULT COLLATE utf8mb4_unicode_ci, COMMENT='foo table';"
    );
  });
});
