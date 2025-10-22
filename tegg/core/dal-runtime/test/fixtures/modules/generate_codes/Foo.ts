import {
  Column,
  ColumnType,
  Geometry,
  GeometryCollection,
  Index,
  IndexType,
  Line,
  IndexStoreType,
  MultiLine,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  Table,
} from '@eggjs/dal-decorator';

@Table({
  name: 'egg_foo',
  comment: 'foo table',
  // autoExtendSize: 1024,
  // autoIncrement: 100,
  // avgRowLength: 1024,
  characterSet: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  // compression: CompressionType.ZLIB,
  // encryption: true,
  // engine: 'NDB',
  // engineAttribute: '{"key":"value"}',
  // secondaryEngineAttribute: '{"key2":"value2"}',
  // insertMethod: InsertMethod.FIRST,
  // keyBlockSize: 1024,
  // maxRows: 1000000,
  // minRows: 100,
  // rowFormat: RowFormat.COMPRESSED,
})
@Index({
  keys: ['name', 'col1'],
  type: IndexType.UNIQUE,
  storeType: IndexStoreType.BTREE,
  comment: 'index comment\n',
  // engineAttribute: '{"key":"value"}',
  // secondaryEngineAttribute: '{"key2":"value2"}',
})
@Index({
  keys: ['col1'],
  type: IndexType.FULLTEXT,
  comment: 'index comment\n',
  // engineAttribute: '{"key":"value"}',
  // secondaryEngineAttribute: '{"key2":"value2"}',
  // parser: 'foo',
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
    },
  )
  id: number;

  @Column(
    {
      type: ColumnType.VARCHAR,
      length: 100,
    },
    {
      uniqueKey: true,
    },
  )
  name: string;

  @Column(
    {
      type: ColumnType.VARCHAR,
      length: 100,
    },
    {
      name: 'col1',
    },
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
    // SRID: 4326,
  })
  geometryColumn: Geometry;

  @Column({
    type: ColumnType.POINT,
    // SRID: 4326,
  })
  pointColumn: Point;

  @Column({
    type: ColumnType.LINESTRING,
    // SRID: 4326,
  })
  lineStringColumn: Line;

  @Column({
    type: ColumnType.POLYGON,
    // SRID: 4326,
  })
  polygonColumn: Polygon;

  @Column({
    type: ColumnType.MULTIPOINT,
    // SRID: 4326,
  })
  multipointColumn: MultiPoint;

  @Column({
    type: ColumnType.MULTILINESTRING,
    // SRID: 4326,
  })
  multiLineStringColumn: MultiLine;

  @Column({
    type: ColumnType.MULTIPOLYGON,
    // SRID: 4326,
  })
  multiPolygonColumn: MultiPolygon;

  @Column({
    type: ColumnType.GEOMETRYCOLLECTION,
    // SRID: 4326,
  })
  geometryCollectionColumn: GeometryCollection;

  @Column({
    type: ColumnType.JSON,
  })
  jsonColumn: object;
}
