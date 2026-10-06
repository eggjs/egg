import {
  AccessLevel,
  type EggProtoImplClass,
  type EggPrototypeInfo,
  type EggPrototypeName,
  InjectType,
  type MetaDataKey,
  type ObjectInitTypeLike,
  type QualifierAttribute,
  type QualifierInfo,
  type QualifierValue,
} from '../../core-decorator/index.ts';
import { type LifecycleContext, type LifecycleObject } from '../../lifecycle/index.ts';
import { type LoadUnit } from './LoadUnit.ts';

export interface InjectObjectProto {
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: PropertyKey;
  /**
   * inject qualifiers
   */
  qualifiers: QualifierInfo[];
  /**
   * optional inject
   */
  optional?: boolean;
  /**
   * inject prototype
   */
  proto: EggPrototype;
}

export interface InjectConstructorProto {
  /**
   * inject args index
   */
  refIndex: number;
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: PropertyKey;
  /**
   * inject qualifiers
   */
  qualifiers: QualifierInfo[];
  /**
   * optional inject
   */
  optional?: boolean;
  /**
   * inject prototype
   */
  proto: EggPrototype;
}

export interface InjectObject {
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: PropertyKey;
  /**
   * obj's initType will be injected
   * if null same as current obj
   */
  initType?: ObjectInitTypeLike;
  /**
   * optional inject
   */
  optional?: boolean;
}

export interface InjectConstructor {
  /**
   * property name obj inject to
   */
  refIndex: number;
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: PropertyKey;
  /**
   * obj's initType will be injected
   * if null same as current obj
   */
  initType?: ObjectInitTypeLike;
  /**
   * optional inject
   */
  optional?: boolean;
}

export type EggPrototypeClass = new (...args: any[]) => EggPrototype;

export interface EggPrototypeLifecycleContext extends LifecycleContext {
  clazz: EggProtoImplClass;
  prototypeInfo: EggPrototypeInfo;
  loadUnit: LoadUnit;
}

export interface EggPrototype extends LifecycleObject<EggPrototypeLifecycleContext> {
  [key: symbol]: PropertyDescriptor;

  // TODO
  // 1. proto name
  // 1. default obj name
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly loadUnitId: string;
  readonly defineModuleName?: string;
  readonly defineUnitPath?: string;
  readonly injectObjects: Array<InjectObjectProto | InjectConstructorProto>;
  readonly injectType?: InjectType;
  readonly className?: string;
  readonly multiInstanceConstructorIndex?: number;
  readonly multiInstanceConstructorAttributes?: QualifierAttribute[];

  /**
   * get metadata for key
   * @param {MetaDataKey} metadataKey
   */
  getMetaData<T>(metadataKey: MetaDataKey): T | undefined;

  /**
   * verify proto is satisfied with qualifier
   *
   * default qualifier:
   * - load unit name
   * - init type
   *
   * @param qualifier
   */
  verifyQualifier(qualifier: QualifierInfo): boolean;
  verifyQualifiers(qualifiers: QualifierInfo[]): boolean;
  getQualifier(attribute: QualifierAttribute): QualifierValue | undefined;

  /**
   * construct egg object, not trigger lifecycle method/hook
   */
  constructEggObject(...args: any): object;
}

export interface EggPrototypeWithClazz extends EggPrototype {
  clazz?: EggProtoImplClass;
}

export type EggPrototypeCreator = (ctx: EggPrototypeLifecycleContext) => EggPrototype;
