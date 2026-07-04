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

  #buildProtoGraph(providedNames: Set<PropertyKey>): ProtoDescriptor[] {
    const index = ProtoGraphUtils.buildProtoNameIndex(this.#protoGraph);
    for (const protoNode of this.#protoGraph.nodes.values()) {
      for (const injectObject of protoNode.val.proto.injectObjects) {
        const injectProto = ProtoGraphUtils.findDependencyProtoNode(
          this.#protoGraph,
          protoNode.val.proto,
          injectObject,
          index,
        );
        if (!injectProto) {
          // Host-provided inner objects are registered on the load unit
          // directly (not part of this graph); their resolution happens at
          // prototype-build time. Anything else missing is a hard error —
          // deferring it to runtime hides broken module plugins.
          if (injectObject.optional || providedNames.has(injectObject.objName)) {
            continue;
          }
          throw new EggPrototypeNotFound(injectObject.objName, protoNode.val.proto.defineModuleName);
        }
        this.#protoGraph.addEdge(protoNode, injectProto, new ProtoDependencyMeta({ injectObj: injectObject.objName }));
      }
    }
    const loopPath = this.#protoGraph.loopPath();
    if (loopPath) {
      throw new Error('inner object proto has recursive deps: ' + loopPath);
    }

    return this.#protoGraph.sort().map((node) => node.val.proto);
  }

  async createLoadUnit(options: CreateInnerObjectLoadUnitOptions): Promise<LoadUnit> {
    const providedNames = new Set<PropertyKey>(Object.keys(options.innerObjects));
    const protos = this.#buildProtoGraph(providedNames);
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
