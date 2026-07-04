import { IdenticalUtil } from '@eggjs/lifecycle';
import { ClassProtoDescriptor, EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import type { EggPrototype, EggPrototypeName, LoadUnit, ProtoDescriptor, QualifierInfo } from '@eggjs/tegg-types';
import { ObjectInitType } from '@eggjs/tegg-types';

import { ProvidedInnerObjectProto } from './ProvidedInnerObjectProto.ts';

export const INNER_OBJECT_LOAD_UNIT_TYPE = 'INNER_OBJECT_LOAD_UNIT';
export const INNER_OBJECT_LOAD_UNIT_NAME = 'InnerObjectLoadUnit';
export const INNER_OBJECT_LOAD_UNIT_PATH = 'InnerObjectLoadUnitPath';

export interface InnerObject {
  obj: object;
  qualifiers?: QualifierInfo[];
}

export interface InnerObjectLoadUnitOptions {
  /** Host-provided, already-constructed objects (logger, router, ...). */
  innerObjects: Record<string, InnerObject[]>;
  /**
   * Proto descriptors of `@InnerObjectProto` / `@XxxLifecycleProto` classes
   * collected from modules, in instantiation (topological) order.
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

  readonly #innerObjects: Record<string, InnerObject[]>;
  readonly #protos: ProtoDescriptor[];
  readonly #protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  constructor(options: InnerObjectLoadUnitOptions) {
    this.name = options.name ?? INNER_OBJECT_LOAD_UNIT_NAME;
    this.unitPath = options.unitPath ?? INNER_OBJECT_LOAD_UNIT_PATH;
    this.id = this.name;
    this.#innerObjects = options.innerObjects;
    this.#protos = options.protos ?? [];
  }

  async init(): Promise<void> {
    for (const [name, objs] of Object.entries(this.#innerObjects)) {
      for (const { obj, qualifiers } of objs) {
        const proto = new ProvidedInnerObjectProto(
          IdenticalUtil.createProtoId(this.id, name),
          name,
          (() => obj) as any,
          ObjectInitType.SINGLETON,
          this.id,
          qualifiers || [],
        );
        EggPrototypeFactory.instance.registerPrototype(proto, this);
      }
    }

    const protoDescriptors = this.#protos.filter((t) => ClassProtoDescriptor.isClassProtoDescriptor(t));
    for (const protoDescriptor of protoDescriptors) {
      const proto = await EggPrototypeCreatorFactory.createProtoByDescriptor(protoDescriptor, this);
      EggPrototypeFactory.instance.registerPrototype(proto, this);
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
  }

  async destroy(): Promise<void> {
    for (const namedProtos of this.#protoMap.values()) {
      for (const proto of Array.from(namedProtos)) {
        EggPrototypeFactory.instance.deletePrototype(proto, this);
      }
    }
    this.#protoMap.clear();
  }

  iterateEggPrototype(): IterableIterator<EggPrototype> {
    const protos: EggPrototype[] = [];
    for (const namedProtos of this.#protoMap.values()) {
      protos.push(...namedProtos);
    }
    return protos.values();
  }
}
