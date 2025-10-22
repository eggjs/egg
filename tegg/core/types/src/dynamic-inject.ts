import type { EggProtoImplClass, QualifierValue } from './core-decorator/index.ts';

export type EggAbstractClazz<T extends object = object> = Function & {
  prototype: T;
};
export type ImplTypeEnum = {
  [id: string]: QualifierValue;
};

export type ImplDecorator<T extends object, Enum extends ImplTypeEnum> = (
  type: Enum[keyof Enum],
) => (clazz: EggProtoImplClass<T>) => void;

export interface EggObjectFactory {
  getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue): Promise<T>;
  getEggObjects<T extends object>(abstractClazz: EggAbstractClazz<T>): Promise<AsyncIterable<T>>;
}

export const QUALIFIER_IMPL_MAP: symbol = Symbol.for('EggPrototype#qualifierImplMap');
