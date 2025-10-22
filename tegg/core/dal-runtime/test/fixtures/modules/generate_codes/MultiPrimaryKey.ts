import { Column, ColumnType, Table } from '@eggjs/dal-decorator';

@Table({
  name: 'multi_primary_key_table',
  comment: 'multi primary key table',
})
export class MultiPrimaryKey {
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
  id1: number;

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
  id2: number;

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
}
