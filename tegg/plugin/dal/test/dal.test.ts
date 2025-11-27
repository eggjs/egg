import { mm, type MockApplication } from '@eggjs/mock';
import { describe, afterEach, beforeAll, afterAll, it, expect } from 'vitest';

// @ts-ignore exclude file
import FooDAO from './fixtures/apps/dal-app/modules/dal/dal/dao/FooDAO.ts';
import { Foo } from './fixtures/apps/dal-app/modules/dal/Foo.ts';
import { getFixtures } from './utils.ts';

describe('plugin/dal/test/dal.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/dal-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('should work', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const fooDAO = await ctx.getEggObject(FooDAO);
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
      foo.dateColumn = new Date('2020-03-15T16:00:00.000Z');
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
      const insertResult = await fooDAO.insert(foo);
      foo.id = insertResult.insertId;

      const findFoo = await fooDAO.findByPrimary(foo.id);
      expect(findFoo).toBeDefined();

      const deleteResult = await fooDAO.delete(foo.id);
      expect(deleteResult.affectedRows).toBe(1);
    });
  });
});
