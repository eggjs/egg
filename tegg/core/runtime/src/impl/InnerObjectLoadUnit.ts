import assert from 'node:assert/strict';

import { ClassProtoDescriptor, EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import type {
  AccessLevel,
  EggPrototype,
  EggPrototypeName,
  LoadUnit,
  ProtoDescriptor,
  QualifierInfo,
} from '@eggjs/tegg-types';

export const INNER_OBJECT_LOAD_UNIT_TYPE = 'INNER_OBJECT_LOAD_UNIT';
export const INNER_OBJECT_LOAD_UNIT_NAME = 'InnerObjectLoadUnit';
export const INNER_OBJECT_LOAD_UNIT_PATH = 'InnerObjectLoadUnitPath';

export interface InnerObject {
  obj: object;
  qualifiers?: QualifierInfo[];
  /**
   * Defaults to PUBLIC (standalone convention: business modules may inject
   * host-provided objects). Hosts with their own resolution surface for these
   * names (e.g. the egg host) should pass PRIVATE so the provided protos stay
   * visible to inner objects only and never pollute cross-unit resolution.
   */
  accessLevel?: AccessLevel;
}

export interface InnerObjectLoadUnitOptions {
  /**
   * Proto descriptors in instantiation (topological) order:
   * `@InnerObjectProto` / `@XxxLifecycleProto` classes collected from
   * modules AND host-provided instances (factory-clazz descriptors with
   * PROVIDED_INNER_OBJECT_PROTO_IMPL_TYPE) — one uniform channel.
   */
  protos?: ProtoDescriptor[];
  name?: string;
  unitPath?: string;
}

/**
 * A host-agnostic load unit holding framework inner objects. It is created and
 * instantiated BEFORE the business global graph is built and before any
 * business load unit is created, so the lifecycle protos it carries can hook
 * into every later phase (graph build, load unit / prototype / object / context
 * lifecycles).
 */
export class InnerObjectLoadUnit implements LoadUnit {
  readonly id: string;
  readonly name: string;
  readonly unitPath: string;
  readonly type: string = INNER_OBJECT_LOAD_UNIT_TYPE;

  readonly #protos: ProtoDescriptor[];
  readonly #protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();
  readonly #orderedProtos: EggPrototype[] = [];

  constructor(options: InnerObjectLoadUnitOptions) {
    this.name = options.name ?? INNER_OBJECT_LOAD_UNIT_NAME;
    this.unitPath = options.unitPath ?? INNER_OBJECT_LOAD_UNIT_PATH;
    this.id = this.name;
    this.#protos = options.protos ?? [];
  }

  async init(): Promise<void> {
    for (const protoDescriptor of this.#protos) {
      assert(
        ClassProtoDescriptor.isClassProtoDescriptor(protoDescriptor),
        `InnerObjectLoadUnit only accepts ClassProtoDescriptor, got ${protoDescriptor.protoImplType}`,
      );
      const proto = await EggPrototypeCreatorFactory.createProtoByDescriptor(protoDescriptor, this);
      EggPrototypeFactory.instance.registerPrototype(proto, this);
      this.#orderedProtos.push(proto);
    }
  }

  containPrototype(proto: EggPrototype): boolean {
    return !!this.#protoMap.get(proto.name)?.find((t) => t === proto);
  }

  getEggPrototype(name: string, qualifiers: QualifierInfo[]): EggPrototype[] {
    const protos = this.#protoMap.get(name);
    return protos?.filter((proto) => proto.verifyQualifiers(qualifiers)) || [];
  }

  registerEggPrototype(proto: EggPrototype): void {
    const protoList = MapUtil.getOrStore(this.#protoMap, proto.name, []);
    protoList.push(proto);
  }

  deletePrototype(proto: EggPrototype): void {
    const protos = this.#protoMap.get(proto.name);
    if (protos) {
      const index = protos.indexOf(proto);
      if (index !== -1) {
        protos.splice(index, 1);
      }
    }
    const orderedIndex = this.#orderedProtos.indexOf(proto);
    if (orderedIndex !== -1) {
      this.#orderedProtos.splice(orderedIndex, 1);
    }
  }

  async destroy(): Promise<void> {
    for (const namedProtos of this.#protoMap.values()) {
      for (const proto of Array.from(namedProtos)) {
        EggPrototypeFactory.instance.deletePrototype(proto, this);
      }
    }
    this.#protoMap.clear();
    this.#orderedProtos.length = 0;
  }

  iterateEggPrototype(): IterableIterator<EggPrototype> {
    return this.#orderedProtos.values();
  }
}
