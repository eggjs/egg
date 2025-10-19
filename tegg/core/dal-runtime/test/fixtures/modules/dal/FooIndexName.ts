import { Column, ColumnType, Index, IndexStoreType, IndexType, Table } from '@eggjs/dal-decorator';

@Table({
  name: 'egg_foo',
  comment: 'foo table',
  characterSet: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
})
@Index({
  keys: ['name', 'col1', 'bitColumn'],
  type: IndexType.UNIQUE,
  storeType: IndexStoreType.BTREE,
  comment: 'index comment\n',
})
@Index({
  keys: ['col1', 'boolColumn'],
  type: IndexType.FULLTEXT,
  comment: 'index comment\n',
})
export class FooIndexName {
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
}
