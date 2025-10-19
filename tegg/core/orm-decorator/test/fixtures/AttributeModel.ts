import { Model, Attribute } from '../../src/index.js';

@Model()
export class AttributeModel {
  @Attribute('varchar', {
    name: 'foo_field',
    allowNull: false,
    autoIncrement: false,
    primary: true,
    unique: true,
  })
  foo: string;
}
