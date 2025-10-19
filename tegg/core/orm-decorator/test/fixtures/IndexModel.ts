import { Model, Attribute, Index } from '../../src/index.js';

@Model()
@Index(['foo'], {
  primary: true,
  unique: true,
  name: 'idx_foo_name',
})
export class IndexModel {
  @Attribute('varchar')
  foo: string;
}
