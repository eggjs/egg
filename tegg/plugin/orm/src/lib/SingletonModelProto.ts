import type {
  EggPrototype,
  LoadUnit,
  EggPrototypeLifecycleContext,
  InjectObjectProto,
  InjectConstructorProto,
} from '@eggjs/tegg-metadata';
import {
  AccessLevel,
  type EggPrototypeName,
  ObjectInitType,
  type QualifierInfo,
  QualifierUtil,
  MetadataUtil,
  type MetaDataKey,
  type QualifierAttribute,
  type QualifierValue,
} from '@eggjs/tegg';
import { type Id, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import type { Bone } from 'leoric';

export default class SingletonModelProto implements EggPrototype {
  [key: symbol]: PropertyDescriptor;
  private readonly qualifiers: QualifierInfo[];
  readonly accessLevel = AccessLevel.PUBLIC;
  id: Id;
  readonly initType = ObjectInitType.SINGLETON;
  readonly injectObjects: (InjectObjectProto | InjectConstructorProto)[] = [];
  readonly loadUnitId: string;
  readonly moduleName: string;
  readonly name: EggPrototypeName;
  readonly model: typeof Bone;

  constructor(loadUnit: LoadUnit, model: typeof Bone) {
    this.model = model;
    this.id = IdenticalUtil.createProtoId(loadUnit.id, `leoric:${model.name}`);
    this.loadUnitId = loadUnit.id;
    this.moduleName = loadUnit.name;
    this.name = model.name;
    this.qualifiers = QualifierUtil.getProtoQualifiers(model);
  }

  constructEggObject(): object {
    return {};
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.model);
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  getQualifier(attribute: QualifierAttribute): QualifierValue | undefined {
    return this.qualifiers.find(t => t.attribute === attribute)?.value;
  }

  static createProto(ctx: EggPrototypeLifecycleContext): SingletonModelProto {
    return new SingletonModelProto(ctx.loadUnit, ctx.clazz as typeof Bone);
  }
}
