import { Model, Attribute, Index } from '../../src/index.js';

@Model()
@Index(['not_exist_field'])
export class InvalidateIndexModel {
  @Attribute('varchar')
  foo: string;
}
