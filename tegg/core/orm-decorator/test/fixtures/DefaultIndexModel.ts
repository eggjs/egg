import { Model, Attribute, Index } from '../../src/index.js';

@Model()
@Index(['foo'])
export class DefaultIndexModel {
  @Attribute('varchar')
  foo: string;
}
