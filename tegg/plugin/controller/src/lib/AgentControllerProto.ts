import { EggPrototypeCreatorFactory } from '@eggjs/metadata';
import type {
  AccessLevel,
  EggPrototype,
  EggPrototypeCreator,
  EggPrototypeLifecycleContext,
  EggPrototypeName,
  InjectConstructorProto,
  InjectObjectProto,
  InjectType,
  MetaDataKey,
  ObjectInitTypeLike,
  QualifierAttribute,
  QualifierInfo,
  QualifierValue,
} from '@eggjs/tegg-types';
import { DEFAULT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';

/**
 * Wraps a standard EggPrototypeImpl (created by the DEFAULT creator) to
 * provide a distinct class identity so that EggObjectFactory can dispatch
 * to AgentControllerObject.createObject.
 *
 * All EggPrototype interface members are delegated to the inner proto.
 * Symbol-keyed properties (qualifier descriptors set by the runtime) are
 * forwarded via a Proxy on `this`.
 */
export class AgentControllerProto implements EggPrototype {
  [key: symbol]: PropertyDescriptor;

  private readonly delegate: EggPrototype;

  constructor(delegate: EggPrototype) {
    this.delegate = delegate;

    // Copy symbol-keyed properties from delegate (qualifier descriptors, etc.)
    for (const sym of Object.getOwnPropertySymbols(delegate)) {
      const desc = Object.getOwnPropertyDescriptor(delegate, sym);
      if (desc) {
        Object.defineProperty(this, sym, desc);
      }
    }
  }

  get id(): string {
    return this.delegate.id;
  }
  get name(): EggPrototypeName {
    return this.delegate.name;
  }
  get initType(): ObjectInitTypeLike {
    return this.delegate.initType;
  }
  get accessLevel(): AccessLevel {
    return this.delegate.accessLevel;
  }
  get loadUnitId(): string {
    return this.delegate.loadUnitId;
  }
  get injectObjects(): Array<InjectObjectProto | InjectConstructorProto> {
    return this.delegate.injectObjects;
  }
  get injectType(): InjectType | undefined {
    return this.delegate.injectType;
  }
  get className(): string | undefined {
    return this.delegate.className;
  }
  get multiInstanceConstructorIndex(): number | undefined {
    return this.delegate.multiInstanceConstructorIndex;
  }
  get multiInstanceConstructorAttributes(): QualifierAttribute[] | undefined {
    return this.delegate.multiInstanceConstructorAttributes;
  }

  getMetaData<T>(metadataKey: MetaDataKey): T | undefined {
    return this.delegate.getMetaData(metadataKey);
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    return this.delegate.verifyQualifier(qualifier);
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    return this.delegate.verifyQualifiers(qualifiers);
  }

  getQualifier(attribute: QualifierAttribute): QualifierValue | undefined {
    return this.delegate.getQualifier(attribute);
  }

  constructEggObject(...args: any): object {
    return this.delegate.constructEggObject(...args);
  }

  static createProto(ctx: EggPrototypeLifecycleContext): AgentControllerProto {
    const defaultCreator: EggPrototypeCreator | undefined =
      EggPrototypeCreatorFactory.getPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE);
    if (!defaultCreator) {
      throw new Error(`Default prototype creator (${DEFAULT_PROTO_IMPL_TYPE}) not registered`);
    }
    const delegate = defaultCreator(ctx);
    return new AgentControllerProto(delegate);
  }
}
