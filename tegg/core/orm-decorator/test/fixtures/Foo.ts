import { Model, DataSource, Index, Attribute } from '../../src/index.js';

@Model({
  tableName: 'a_foo_table',
})
@DataSource('a_db')
@Index(['name'], {
  unique: true,
})
export class Foo {
  @Attribute('int', {
    name: 'pid',
    allowNull: false,
    autoIncrement: true,
    primary: true,
  })
  id: number;

  @Attribute('varchar(20)')
  name: string;

  @Attribute('varchar(20)', {
    unique: true,
  })
  foo: string;
}
