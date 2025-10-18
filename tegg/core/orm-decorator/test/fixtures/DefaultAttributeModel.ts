import { Model, Attribute } from '../../src/index.js';

@Model()
export class DefaultAttributeModel {
  @Attribute('varchar')
  foo: string;
}
