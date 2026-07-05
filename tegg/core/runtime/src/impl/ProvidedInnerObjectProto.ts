import { MetadataUtil } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import { EggPrototypeCreatorFactory } from '@eggjs/metadata';
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
  /** NOT a class: the factory `() => obj` returning the provided instance. */
  private readonly objFactory: () => object;
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
    objFactory: () => object,
    initType: ObjectInitTypeLike,
    loadUnitId: Id,
    qualifiers: QualifierInfo[],
    accessLevel?: AccessLevel,
  ) {
    this.id = id;
    this.objFactory = objFactory;
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
    // no `new`: calling the factory returns the host-provided instance
    return this.objFactory();
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return MetadataUtil.getMetaData(metadataKey, this.objFactory as unknown as EggProtoImplClass);
  }

  getQualifier(attribute: string): QualifierValue | undefined {
    return this.qualifiers.find((t) => t.attribute === attribute)?.value;
  }

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    // The descriptor rides the standard EggPrototypeLifecycleContext, whose
    // `clazz` slot carries the provided-instance factory (see the builder).
    const { clazz, loadUnit } = ctx;
    const name = ctx.prototypeInfo.name;
    const id = IdenticalUtil.createProtoId(loadUnit.id, name);
    return new ProvidedInnerObjectProto(
      id,
      name,
      clazz as unknown as () => object,
      ctx.prototypeInfo.initType,
      loadUnit.id,
      ctx.prototypeInfo.qualifiers ?? [],
      ctx.prototypeInfo.accessLevel,
    );
  }
}

/**
 * protoImplType for host-provided, already-constructed instances. The
 * descriptor carries a factory `clazz` (`() => obj`) so provided objects are
 * ordinary protos end to end: same graph vertices, same creator dispatch,
 * same instantiation loop — "constructing" one returns the instance.
 */
export const PROVIDED_INNER_OBJECT_PROTO_IMPL_TYPE = 'PROVIDED_INNER_OBJECT';

EggPrototypeCreatorFactory.registerPrototypeCreator(
  PROVIDED_INNER_OBJECT_PROTO_IMPL_TYPE,
  ProvidedInnerObjectProto.create,
);

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
