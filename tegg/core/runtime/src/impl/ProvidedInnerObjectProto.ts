import { MetadataUtil, QualifierUtil } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import type { EggPrototypeLifecycleContext } from '@eggjs/metadata';
import type {
  EggObject,
  EggObjectName,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeName,
  Id,
  InjectObjectProto,
  MetaDataKey,
  ObjectInitTypeLike,
  QualifierInfo,
  QualifierValue,
} from '@eggjs/tegg-types';
import { AccessLevel } from '@eggjs/tegg-types';

import { EggObjectFactory } from '../factory/EggObjectFactory.ts';

/**
 * EggPrototype for a host-provided, already-constructed inner object
 * (e.g. logger / router instances handed in by the host). It has no inject
 * objects and always resolves to the provided instance.
 */
export class ProvidedInnerObjectProto implements EggPrototype {
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
    accessLevel?: AccessLevel,
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.initType = initType;
    this.accessLevel = accessLevel ?? AccessLevel.PUBLIC;
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
    const selfQualifier = this.qualifiers.find((t) => t.attribute === qualifier.attribute);
    return selfQualifier?.value === qualifier.value;
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
    return new ProvidedInnerObjectProto(
      id,
      name,
      clazz,
      ctx.prototypeInfo.initType,
      loadUnit.id,
      QualifierUtil.getProtoQualifiers(clazz),
    );
  }
}

export class ProvidedInnerObject implements EggObject {
  readonly isReady: boolean = true;
  #obj: object;
  readonly proto: ProvidedInnerObjectProto;
  readonly name: EggObjectName;
  readonly id: string;

  constructor(name: EggObjectName, proto: ProvidedInnerObjectProto) {
    this.proto = proto;
    this.name = name;
    this.id = IdenticalUtil.createObjectId(this.proto.id);
  }

  get obj(): object {
    if (!this.#obj) {
      this.#obj = this.proto.constructEggObject();
    }
    return this.#obj;
  }

  injectProperty(): void {
    return;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<ProvidedInnerObject> {
    return new ProvidedInnerObject(name, proto as ProvidedInnerObjectProto);
  }
}

EggObjectFactory.registerEggObjectCreateMethod(ProvidedInnerObjectProto, ProvidedInnerObject.createObject);
