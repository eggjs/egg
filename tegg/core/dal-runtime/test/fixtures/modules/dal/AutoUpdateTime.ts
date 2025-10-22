import { Column, ColumnType, Table } from '@eggjs/dal-decorator';

@Table()
export class AutoUpdateTime {
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
      type: ColumnType.DATETIME,
      autoUpdate: true,
    },
    {
      uniqueKey: true,
    },
  )
  date: Date;

  @Column(
    {
      type: ColumnType.DATETIME,
      precision: 3,
      autoUpdate: true,
    },
    {
      uniqueKey: true,
    },
  )
  date2: Date;

  @Column(
    {
      type: ColumnType.TIMESTAMP,
      autoUpdate: true,
    },
    {
      uniqueKey: true,
    },
  )
  date3: Date;

  @Column(
    {
      type: ColumnType.TIMESTAMP,
      precision: 3,
      autoUpdate: true,
    },
    {
      uniqueKey: true,
    },
  )
  date4: Date;
}
