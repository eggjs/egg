import {
  EggPrototypeNotFound,
  LoadUnitFactory,
  ProtoDependencyMeta,
  ProtoDescriptorHelper,
  ProtoGraphUtils,
  ProtoNode,
} from '@eggjs/metadata';
import { Graph, GraphNode } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass, LoadUnit, ProtoDescriptor } from '@eggjs/tegg-types';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';

import {
  INNER_OBJECT_LOAD_UNIT_NAME,
  INNER_OBJECT_LOAD_UNIT_PATH,
  INNER_OBJECT_LOAD_UNIT_TYPE,
  type InnerObject,
  InnerObjectLoadUnit,
} from './InnerObjectLoadUnit.ts';
// Import for the side effect of registering the load unit instance class.
import './InnerObjectLoadUnitInstance.ts';

export interface InnerObjectModuleReference {
  name: string;
  path: string;
}

export interface CreateInnerObjectLoadUnitOptions {
  /** Host-provided, already-constructed objects (logger, router, ...). */
  innerObjects: Record<string, InnerObject[]>;
  name?: string;
  unitPath?: string;
}

/**
 * Collects `@InnerObjectProto` / `@XxxLifecycleProto` classes from scanned
 * modules, resolves their mutual dependencies on a dedicated proto graph
 * (topological order + cycle detection), and creates the InnerObjectLoadUnit
 * that instantiates them before any business load unit exists.
 *
 * Must be driven inside the host's TeggScope: the load unit creator it
 * registers captures per-app state and lands in the per-app creator overlay.
 */
export class InnerObjectLoadUnitBuilder {
  readonly #protoGraph: Graph<ProtoNode, ProtoDependencyMeta> = new Graph();

  addInnerObjectClazzList(clazzList: readonly EggProtoImplClass[], moduleReference: InnerObjectModuleReference): void {
    for (const clazz of clazzList) {
      const descriptor = ProtoDescriptorHelper.createByInstanceClazz(clazz, {
        moduleName: INNER_OBJECT_LOAD_UNIT_NAME,
        unitPath: INNER_OBJECT_LOAD_UNIT_PATH,
        defineModuleName: moduleReference.name,
        defineUnitPath: moduleReference.path,
      });
      const protoGraphNode = new GraphNode<ProtoNode, ProtoDependencyMeta>(new ProtoNode(descriptor));
      if (!this.#protoGraph.addVertex(protoGraphNode)) {
        throw new Error(`duplicate inner object proto: ${protoGraphNode.val}`);
      }
    }
  }

  /** protoImplType marking host-provided instances in the builder graph. */
  static readonly PROVIDED_PROTO_IMPL_TYPE = 'PROVIDED_INNER_OBJECT';

  /**
   * Host-provided instances are graph citizens like every hook proto: same
   * descriptor shape, same vertices, same edge resolution and topological
   * sort (they trivially sort first — no outgoing edges). Only the
   * instantiation step skips them, because the instance already exists.
   */
  static #providedDescriptors(innerObjects: Record<string, InnerObject[]>): ProtoDescriptor[] {
    const descriptors: ProtoDescriptor[] = [];
    for (const [name, objects] of Object.entries(innerObjects)) {
      for (const innerObject of objects) {
        descriptors.push({
          name,
          accessLevel: innerObject.accessLevel ?? AccessLevel.PUBLIC,
          initType: ObjectInitType.SINGLETON,
          protoImplType: InnerObjectLoadUnitBuilder.PROVIDED_PROTO_IMPL_TYPE,
          qualifiers: ProtoDescriptorHelper.addDefaultQualifier(
            innerObject.qualifiers ?? [],
            ObjectInitType.SINGLETON,
            INNER_OBJECT_LOAD_UNIT_NAME,
          ),
          injectObjects: [],
          properQualifiers: {},
          defineModuleName: INNER_OBJECT_LOAD_UNIT_NAME,
          defineUnitPath: INNER_OBJECT_LOAD_UNIT_PATH,
          instanceModuleName: INNER_OBJECT_LOAD_UNIT_NAME,
          instanceDefineUnitPath: INNER_OBJECT_LOAD_UNIT_PATH,
          equal: () => false,
        });
      }
    }
    return descriptors;
  }

  #buildProtoGraph(): ProtoDescriptor[] {
    const index = ProtoGraphUtils.buildProtoNameIndex(this.#protoGraph);
    for (const protoNode of this.#protoGraph.nodes.values()) {
      for (const injectObject of protoNode.val.proto.injectObjects) {
        const injectProto = ProtoGraphUtils.findDependencyProtoNode(
          this.#protoGraph,
          protoNode.val.proto,
          injectObject,
          index,
        );
        if (injectProto) {
          this.#protoGraph.addEdge(
            protoNode,
            injectProto,
            new ProtoDependencyMeta({ injectObj: injectObject.objName }),
          );
          continue;
        }
        if (injectObject.optional) {
          continue;
        }
        // Missing is a hard error — deferring it to runtime hides broken
        // module plugins.
        throw new EggPrototypeNotFound(injectObject.objName, protoNode.val.proto.defineModuleName);
      }
    }
    const loopPath = this.#protoGraph.loopPath();
    if (loopPath) {
      throw new Error('inner object proto has recursive deps: ' + loopPath);
    }

    // Provided instances participated in resolution and ordering above; the
    // instantiation list excludes them because their objects already exist
    // (the load unit registers them from options.innerObjects).
    return this.#protoGraph
      .sort()
      .map((node) => node.val.proto)
      .filter((proto) => proto.protoImplType !== InnerObjectLoadUnitBuilder.PROVIDED_PROTO_IMPL_TYPE);
  }

  async createLoadUnit(options: CreateInnerObjectLoadUnitOptions): Promise<LoadUnit> {
    for (const descriptor of InnerObjectLoadUnitBuilder.#providedDescriptors(options.innerObjects)) {
      const node = new GraphNode<ProtoNode, ProtoDependencyMeta>(new ProtoNode(descriptor));
      if (!this.#protoGraph.addVertex(node)) {
        throw new Error(`duplicate provided inner object: ${node.val}`);
      }
    }
    const protos = this.#buildProtoGraph();
    LoadUnitFactory.registerLoadUnitCreator(INNER_OBJECT_LOAD_UNIT_TYPE, () => {
      return new InnerObjectLoadUnit({
        innerObjects: options.innerObjects,
        protos,
        name: options.name,
        unitPath: options.unitPath,
      });
    });

    return await LoadUnitFactory.createLoadUnit(
      options.unitPath ?? INNER_OBJECT_LOAD_UNIT_PATH,
      INNER_OBJECT_LOAD_UNIT_TYPE,
      {
        async load(): Promise<EggProtoImplClass[]> {
          return [];
        },
      },
    );
  }
}
