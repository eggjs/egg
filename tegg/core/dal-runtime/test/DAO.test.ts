import assert from 'node:assert';
import path from 'node:path';

import { describe, it, beforeAll, afterAll } from 'vitest';
import { TableModel } from '@eggjs/dal-decorator';

import { MysqlDataSource, SqlMapLoader, DataSource, DatabaseForker } from '../src/index.ts';
import { Foo } from './fixtures/modules/dal/Foo.ts';
import FooDAO from './fixtures/modules/dal/dal/dao/FooDAO.ts';
import { BaseFooDAO } from './fixtures/modules/dal/dal/dao/base/BaseFooDAO.ts';

describe('test/DAO.test.ts', () => {
  let dataSource: DataSource<Foo>;
  let tableModel: TableModel<Foo>;
  let forker: DatabaseForker;

  beforeAll(async () => {
    const mysqlOptions = {
      name: 'foo',
      host: '127.0.0.1',
      user: 'root',
      database: 'test_runtime_dao',
      timezone: '+08:00',
      initSql: "SET GLOBAL time_zone = '+08:00';",
      forkDb: true,
    };
    forker = new DatabaseForker('unittest', mysqlOptions);
    await forker.forkDb(path.join(__dirname, './fixtures/modules/dal'));

    const mysql = new MysqlDataSource(mysqlOptions);
    await mysql.ready();

    tableModel = TableModel.build(Foo);
    const sqlMapLoader = new SqlMapLoader(tableModel, BaseFooDAO, console as any);
    const sqlMap = sqlMapLoader.load();
    dataSource = new DataSource(tableModel, mysql, sqlMap);
  });

  afterAll(async () => {
    await forker.destroy();
  });

  it('execute should work', async () => {
    const foo = new Foo();
    foo.name = 'name';
    foo.col1 = 'col1';
    foo.bitColumn = Buffer.from([0, 0]);
    foo.boolColumn = 0;
    foo.tinyIntColumn = 0;
    foo.smallIntColumn = 1;
    foo.mediumIntColumn = 3;
    foo.intColumn = 3;
    foo.bigIntColumn = '00099';
    foo.decimalColumn = '00002.33333';
    foo.floatColumn = 2.3;
    foo.doubleColumn = 2.3;
    foo.dateColumn = new Date('2024-03-16T16:00:00.000Z');
    foo.dateTimeColumn = new Date('2024-03-16T01:26:58.677Z');
    foo.timestampColumn = new Date('2024-03-16T01:26:58.677Z');
    foo.timeColumn = '838:59:50.123';
    foo.yearColumn = 2024;
    foo.varCharColumn = 'var_char';
    foo.binaryColumn = Buffer.from('b');
    foo.varBinaryColumn = Buffer.from('var_binary');
    foo.tinyBlobColumn = Buffer.from('tiny_blob');
    foo.tinyTextColumn = 'text';
    foo.blobColumn = Buffer.from('blob');
    foo.textColumn = 'text';
    foo.mediumBlobColumn = Buffer.from('medium_blob');
    foo.longBlobColumn = Buffer.from('long_blob');
    foo.mediumTextColumn = 'medium_text';
    foo.longTextColumn = 'long_text';
    foo.enumColumn = 'A';
    foo.setColumn = 'B';
    foo.geometryColumn = { x: 10, y: 10 };
    foo.pointColumn = { x: 10, y: 10 };
    foo.lineStringColumn = [
      { x: 15, y: 15 },
      { x: 20, y: 20 },
    ];
    foo.polygonColumn = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ],
      [
        { x: 5, y: 5 },
        { x: 7, y: 5 },
        { x: 7, y: 7 },
        { x: 5, y: 7 },
        { x: 5, y: 5 },
      ],
    ];
    foo.multipointColumn = [
      { x: 0, y: 0 },
      { x: 20, y: 20 },
      { x: 60, y: 60 },
    ];
    foo.multiLineStringColumn = [
      [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      [
        { x: 15, y: 15 },
        { x: 30, y: 15 },
      ],
    ];
    foo.multiPolygonColumn = [
      [
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
          { x: 0, y: 0 },
        ],
      ],
      [
        [
          { x: 5, y: 5 },
          { x: 7, y: 5 },
          { x: 7, y: 7 },
          { x: 5, y: 7 },
          { x: 5, y: 5 },
        ],
      ],
    ];
    foo.geometryCollectionColumn = [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
      [
        { x: 15, y: 15 },
        { x: 20, y: 20 },
      ],
    ];
    foo.jsonColumn = {
      hello: 'json',
    };

    const fooDao = new FooDAO();
    (fooDao as any).dataSource = dataSource;

    const insertResult = await fooDao.insert(foo);
    assert(insertResult);
    foo.id = insertResult.insertId;

    const updateResult = await fooDao.update(foo.id, {
      name: 'update_name_2',
    });
    assert(updateResult);
    assert.equal(updateResult.affectedRows, 1);

    foo.name = 'update_name_2';

    const fooRow = await fooDao.findByPrimary(foo.id);
    assert.deepStrictEqual(fooRow, foo);

    const fooRows = await fooDao.findByCol1(foo.col1);
    assert.equal(fooRows.length, 1);

    assert.deepStrictEqual(fooRows[0], foo);

    await fooDao.delete(foo.id);

    const fooRow2 = await fooDao.findByPrimary(foo.id);
    assert.equal(fooRow2, null);
  });
});
