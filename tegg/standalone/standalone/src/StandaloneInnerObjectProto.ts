import type { EggPrototype, InjectObjectProto, EggPrototypeLifecycleContext } from '@eggjs/metadata';
import {
  AccessLevel,
  type EggProtoImplClass,
  type EggPrototypeName,
  type MetaDataKey,
  MetadataUtil,
  type ObjectInitTypeLike,
  type QualifierInfo,
  QualifierUtil,
  type Id,
  IdenticalUtil,
  type QualifierValue,
} from '@eggjs/tegg';

export class StandaloneInnerObjectProto implements EggPrototype {
  [key: symbol]: PropertyDescriptor;
  private readonly clazz: EggProtoImplClass;
  private readonly qualifiers: QualifierInfo[];

  readonly id: string;
  readonly name: EggPrototypeName;
  readonly initType: ObjectInitTypeLike;
  readonly accessLevel: AccessLevel;
  readonly injectObjects: InjectObjectProto[];
  readonly loadUnitId: Id;

  constructor(
    id: string,
    name: EggPrototypeName,
    clazz: EggProtoImplClass,
    initType: ObjectInitTypeLike,
    loadUnitId: Id,
    qualifiers: QualifierInfo[],
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.initType = initType;
    this.accessLevel = AccessLevel.PUBLIC;
    this.injectObjects = [];
    this.loadUnitId = loadUnitId;
    this.qualifiers = qualifiers;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find((t) => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  constructEggObject(): object {
    return Reflect.apply(this.clazz, null, []);
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.clazz);
  }

  getQualifier(attribute: string): QualifierValue | undefined {
    return this.qualifiers.find((t) => t.attribute === attribute)?.value;
  }

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const name = ctx.prototypeInfo.name;
    const id = IdenticalUtil.createProtoId(loadUnit.id, name);
    const proto = new StandaloneInnerObjectProto(
      id,
      name,
      clazz,
      ctx.prototypeInfo.initType,
      loadUnit.id,
      QualifierUtil.getProtoQualifiers(clazz),
    );
    return proto;
  }
}
