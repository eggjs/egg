import {
  Column,
  ColumnType,
  type Geometry,
  type GeometryCollection,
  Index,
  IndexType,
  IndexStoreType,
  type Line,
  type MultiLine,
  type MultiPoint,
  type MultiPolygon,
  type Point,
  type Polygon,
  Table,
} from '@eggjs/dal-decorator';

@Table({
  name: 'egg_foo',
  comment: 'foo table',
  characterSet: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
})
@Index({
  keys: ['name', 'col1'],
  type: IndexType.UNIQUE,
  storeType: IndexStoreType.BTREE,
  comment: 'index comment\n',
})
@Index({
  keys: ['col1'],
  type: IndexType.FULLTEXT,
  comment: 'index comment\n',
})
export class Foo {
  @Column(
    {
      type: ColumnType.INT,
    },
    {
      primaryKey: true,
      autoIncrement: true,
      comment: 'the primary key',
    }
  )
  id: number;

  @Column(
    {
      type: ColumnType.VARCHAR,
      length: 100,
    },
    {
      uniqueKey: true,
    }
  )
  name: string;

  @Column(
    {
      type: ColumnType.VARCHAR,
      length: 100,
    },
    {
      name: 'col1',
    }
  )
  col1: string;

  @Column({
    type: ColumnType.BIT,
    length: 10,
  })
  bitColumn: Buffer;

  @Column({
    type: ColumnType.BOOL,
  })
  boolColumn: 0 | 1;

  @Column({
    type: ColumnType.TINYINT,
    length: 5,
    unsigned: true,
    zeroFill: true,
  })
  tinyIntColumn: number;

  @Column({
    type: ColumnType.SMALLINT,
    length: 5,
    unsigned: true,
    zeroFill: true,
  })
  smallIntColumn: number;

  @Column({
    type: ColumnType.MEDIUMINT,
    length: 5,
    unsigned: true,
    zeroFill: true,
  })
  mediumIntColumn: number;

  @Column({
    type: ColumnType.INT,
    length: 5,
    unsigned: true,
    zeroFill: true,
  })
  intColumn: number;

  @Column({
    type: ColumnType.BIGINT,
    length: 5,
    unsigned: true,
    zeroFill: true,
  })
  bigIntColumn: string;

  @Column({
    type: ColumnType.DECIMAL,
    length: 10,
    fractionalLength: 5,
    unsigned: true,
    zeroFill: true,
  })
  decimalColumn: string;

  @Column({
    type: ColumnType.FLOAT,
    length: 10,
    fractionalLength: 5,
    unsigned: true,
    zeroFill: true,
  })
  floatColumn: number;

  @Column({
    type: ColumnType.DOUBLE,
    length: 10,
    fractionalLength: 5,
    unsigned: true,
    zeroFill: true,
  })
  doubleColumn: number;

  @Column({
    type: ColumnType.DATE,
  })
  dateColumn: Date;

  @Column({
    type: ColumnType.DATETIME,
    precision: 3,
  })
  dateTimeColumn: Date;

  @Column({
    type: ColumnType.TIMESTAMP,
    precision: 3,
  })
  timestampColumn: Date;

  @Column({
    type: ColumnType.TIME,
    precision: 3,
  })
  timeColumn: string;

  @Column({
    type: ColumnType.YEAR,
  })
  yearColumn: number;

  @Column({
    type: ColumnType.VARCHAR,
    length: 100,
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  varCharColumn: string;

  @Column({
    type: ColumnType.BINARY,
  })
  binaryColumn: Buffer;

  @Column({
    type: ColumnType.VARBINARY,
    length: 100,
  })
  varBinaryColumn: Buffer;

  @Column({
    type: ColumnType.TINYBLOB,
  })
  tinyBlobColumn: Buffer;

  @Column({
    type: ColumnType.TINYTEXT,
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  tinyTextColumn: string;

  @Column({
    type: ColumnType.BLOB,
    length: 100,
  })
  blobColumn: Buffer;

  @Column({
    type: ColumnType.TEXT,
    length: 100,
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  textColumn: string;

  @Column({
    type: ColumnType.MEDIUMBLOB,
  })
  mediumBlobColumn: Buffer;

  @Column({
    type: ColumnType.LONGBLOB,
  })
  longBlobColumn: Buffer;

  @Column({
    type: ColumnType.MEDIUMTEXT,
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  mediumTextColumn: string;

  @Column({
    type: ColumnType.LONGTEXT,
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  longTextColumn: string;

  @Column({
    type: ColumnType.ENUM,
    enums: ['A', 'B'],
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  enumColumn: string;

  @Column({
    type: ColumnType.SET,
    enums: ['A', 'B'],
    characterSet: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  })
  setColumn: string;

  @Column({
    type: ColumnType.GEOMETRY,
  })
  geometryColumn: Geometry;

  @Column({
    type: ColumnType.POINT,
  })
  pointColumn: Point;

  @Column({
    type: ColumnType.LINESTRING,
  })
  lineStringColumn: Line;

  @Column({
    type: ColumnType.POLYGON,
  })
  polygonColumn: Polygon;

  @Column({
    type: ColumnType.MULTIPOINT,
  })
  multipointColumn: MultiPoint;

  @Column({
    type: ColumnType.MULTILINESTRING,
  })
  multiLineStringColumn: MultiLine;

  @Column({
    type: ColumnType.MULTIPOLYGON,
  })
  multiPolygonColumn: MultiPolygon;

  @Column({
    type: ColumnType.GEOMETRYCOLLECTION,
  })
  geometryCollectionColumn: GeometryCollection;

  @Column({
    type: ColumnType.JSON,
  })
  jsonColumn: object;

  static buildObj(): Foo {
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
    return foo;
  }
}
