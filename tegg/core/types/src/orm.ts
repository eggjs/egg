export interface AttributeOptions {
  // field name, default is property name
  name?: string;
  // allow null, default is true
  allowNull?: boolean;
  // auto increment, default is false
  autoIncrement?: boolean;
  // primary field, default is false
  primary?: boolean;
  // unique field, default is false
  unique?: boolean;
}

export interface IndexOptions {
  unique?: boolean;
  primary?: boolean;
  name?: string;
}

export interface ModelParams {
  tableName?: string;
  dataSource?: string;
}

export interface ModelIndexInfo {
  fields: string[];
  options?: IndexOptions;
}

export interface ModelAttributeInfo {
  dataType: string;
  options?: AttributeOptions;
}

export const MODEL_PROTO_IMPL_TYPE = 'MODEL_PROTO';

export const IS_MODEL: symbol = Symbol.for('EggPrototype#model#isModel');
export const MODEL_DATA_SOURCE: symbol = Symbol.for('EggPrototype#model#dataSource');
export const MODEL_DATA_TABLE_NAME: symbol = Symbol.for('EggPrototype#model#tableName');
export const MODEL_DATA_INDICES: symbol = Symbol.for('EggPrototype#model#indices');
export const MODEL_DATA_ATTRIBUTES: symbol = Symbol.for('EggPrototype#model#attributes');
