import { debuglog } from 'node:util';

import { FrameworkErrorFormatter } from '@eggjs/errors';
import { Graph, GraphNode, type ModuleReference } from '@eggjs/tegg-common-util';
import { type InjectObjectDescriptor, type ProtoDescriptor, TeggScope, type TeggScopeBag } from '@eggjs/tegg-types';

import { EggPrototypeNotFound } from '../../errors.ts';
import type { ModuleDescriptor } from '../ModuleDescriptor.ts';
import { ModuleDependencyMeta, GlobalModuleNode } from './GlobalModuleNode.ts';
import { GlobalModuleNodeBuilder } from './GlobalModuleNodeBuilder.ts';
import { ProtoGraphUtils, type ProtoNameIndex } from './ProtoGraphUtils.ts';
import { ProtoDependencyMeta, ProtoNode } from './ProtoNode.ts';

const debug = debuglog('tegg/core/metadata/model/graph/GlobalGraph');

const GLOBAL_GRAPH_SLOT = Symbol('tegg:metadata:globalGraph');

export interface GlobalGraphOptions {
  // TODO next major version refactor to force strict
  // all proto should be load before build global graph
  strict?: boolean;
}

export type GlobalGraphBuildHook = (globalGraph: GlobalGraph) => void;

/**
 * Sort all prototypes and modules in app.
 * - 1. LoaderFactory.loadApp: get ModuleDescriptors
 * - 2. GlobalGraph.create: create global graph instance
 * - 3. graph.build:
 *   - check duplicated prototypes exits
 *   - check inject object exists (only in strict mode,
 *   can register proto in hooks now, in next major version,
 *   should use load to create dynamic ProtoDescriptor and delete
 *   strict false options
 *   )
 * - 4. graph.sort: build moduleConfigList and moduleProtoDescriptorMap
 */
export class GlobalGraph {
  /**
   * Vertex: ModuleNode, collect prototypes in module
   * Edge: ModuleDependencyMeta, prototype and it's inject object
   * @private
   */
  moduleGraph: Graph<GlobalModuleNode, ModuleDependencyMeta>;
  /**
   * Vertex: ProtoNode, collect all prototypes in app
   * Edge: ProtoDependencyMeta, inject object
   * @private
   */
  protoGraph: Graph<ProtoNode, ProtoDependencyMeta>;
  /**
   * The order of the moduleConfigList is the order in which they are instantiated
   */
  moduleConfigList: readonly ModuleReference[];
  /**
   * key: module name
   * value: ProtoDescriptor in module, the order is the order in which they are instantiated
   */
  moduleProtoDescriptorMap: Map<string, ProtoDescriptor[]>;
  strict: boolean;
  private buildHooks: GlobalGraphBuildHook[];
  /** Lazily built proto-name index for dependency resolution; invalidated on vertex changes. */
  #protoNameIndex: ProtoNameIndex | null = null;

  /**
   * The per-app graph instance used in ModuleLoadUnit, backed by TeggScope: the
   * active app's bag (or, with no scope, the sole-app / process-default bag) is
   * the single source of truth — undefined until the loader assigns it during
   * boot. Call sites stay unchanged.
   */
  static get instance(): GlobalGraph | undefined {
    return TeggScope.getOr<GlobalGraph>(GLOBAL_GRAPH_SLOT, () => undefined, 'GlobalGraph.instance');
  }

  static set instance(value: GlobalGraph | undefined) {
    TeggScope.set(GLOBAL_GRAPH_SLOT, value);
  }

  /**
   * Resolve a specific app's graph directly from its bag (no active scope needed).
   * Used by plugins to register build hooks onto the owning app's graph.
   */
  static instanceFor(bag: TeggScopeBag): GlobalGraph | undefined {
    return bag.get(GLOBAL_GRAPH_SLOT) as GlobalGraph | undefined;
  }

  constructor(options?: GlobalGraphOptions) {
    this.moduleGraph = new Graph<GlobalModuleNode, ModuleDependencyMeta>();
    this.protoGraph = new Graph<ProtoNode, ProtoDependencyMeta>();
    this.strict = options?.strict ?? false;
    this.moduleProtoDescriptorMap = new Map();
    this.buildHooks = [];
  }

  registerBuildHook(hook: GlobalGraphBuildHook): void {
    this.buildHooks.push(hook);
  }

  addModuleNode(moduleNode: GlobalModuleNode): void {
    if (!this.moduleGraph.addVertex(new GraphNode<GlobalModuleNode, ModuleDependencyMeta>(moduleNode))) {
      throw new Error(`duplicate module: ${moduleNode}`);
    }
    for (const protoNode of moduleNode.protos) {
      if (!this.protoGraph.addVertex(protoNode)) {
        throw new Error(`duplicate proto: ${protoNode.val}`);
      }
    }
    this.#protoNameIndex = null;
  }

  build(): void {
    for (const moduleNode of this.moduleGraph.nodes.values()) {
      for (const protoNode of moduleNode.val.protos) {
        for (const injectObj of protoNode.val.proto.injectObjects) {
          this.buildInjectEdge(moduleNode, protoNode, injectObj);
        }
      }
    }
    for (const buildHook of this.buildHooks) {
      buildHook(this);
    }
  }

  buildInjectEdge(
    moduleNode: GraphNode<GlobalModuleNode, ModuleDependencyMeta>,
    protoNode: GraphNode<ProtoNode, ProtoDependencyMeta>,
    injectObj: InjectObjectDescriptor,
  ): void {
    const injectProto = this.findDependencyProtoNode(protoNode.val.proto, injectObj);
    if (!injectProto) {
      if (!this.strict) {
        return;
      }
      throw FrameworkErrorFormatter.formatError(
        new EggPrototypeNotFound(injectObj.objName, protoNode.val.proto.instanceModuleName),
      );
    }
    this.addInject(moduleNode, protoNode, injectProto, injectObj.objName);
  }

  addInject(
    moduleNode: GraphNode<GlobalModuleNode, ModuleDependencyMeta>,
    protoNode: GraphNode<ProtoNode, ProtoDependencyMeta>,
    injectNode: GraphNode<ProtoNode, ProtoDependencyMeta>,
    injectName: PropertyKey,
  ): void {
    this.protoGraph.addEdge(
      protoNode,
      injectNode,
      new ProtoDependencyMeta({
        injectObj: injectName,
      }),
    );
    const injectModule = this.findModuleNode(injectNode.val.proto.instanceModuleName);
    if (!injectModule) {
      if (!this.strict) {
        return;
      }
      throw new Error(`not found module ${injectNode.val.proto.instanceModuleName}`);
    }
    if (moduleNode.val.id !== injectModule.val.id) {
      this.moduleGraph.addEdge(moduleNode, injectModule, new ModuleDependencyMeta(protoNode.val.proto, injectName));
    }
  }

  findInjectProto(proto: ProtoDescriptor, injectObject: InjectObjectDescriptor): ProtoDescriptor | undefined {
    const edge = this.protoGraph.findToNode(
      ProtoNode.createProtoId(proto),
      new ProtoDependencyMeta({
        injectObj: injectObject.objName,
      }),
    );
    return edge?.val.proto;
  }

  findDependencyProtoNode(
    proto: ProtoDescriptor,
    injectObject: InjectObjectDescriptor,
  ): GraphNode<ProtoNode, ProtoDependencyMeta> | undefined {
    this.#protoNameIndex ??= ProtoGraphUtils.buildProtoNameIndex(this.protoGraph);
    return ProtoGraphUtils.findDependencyProtoNode(this.protoGraph, proto, injectObject, this.#protoNameIndex);
  }

  findModuleNode(moduleName: string): GraphNode<GlobalModuleNode, ModuleDependencyMeta> | undefined {
    for (const node of this.moduleGraph.nodes.values()) {
      if (node.val.name === moduleName) {
        return node;
      }
    }
  }

  #sortModule() {
    const loopPath = this.moduleGraph.loopPath();
    if (loopPath) {
      throw new Error('module has recursive deps: ' + loopPath);
    }
    debug('sortModule, loopPath: %o', loopPath);
    this.moduleConfigList = this.moduleGraph
      .sort()
      .filter((t) => {
        return t.val.optional !== true || t.fromNodeMap.size > 0;
      })
      .map((t) => {
        return {
          name: t.val.name,
          path: t.val.unitPath,
          optional: t.val.optional,
        };
      });
  }

  #sortClazz() {
    const loopPath = this.protoGraph.loopPath();
    if (loopPath) {
      throw new Error('proto has recursive deps: ' + loopPath);
    }
    debug('sortClazz, loopPath: %o', loopPath);
    for (const proto of this.protoGraph.sort()) {
      // // ignore the proto has no dependent
      // if (proto.fromNodeMap.size === 0) continue;
      const instanceModuleName = proto.val.proto.instanceModuleName;
      let moduleProtoList = this.moduleProtoDescriptorMap.get(instanceModuleName);
      if (!moduleProtoList) {
        moduleProtoList = [];
        this.moduleProtoDescriptorMap.set(instanceModuleName, moduleProtoList);
      }
      moduleProtoList.push(proto.val.proto);
    }
  }

  sort(): void {
    this.#sortModule();
    this.#sortClazz();
  }

  static async create(moduleDescriptors: ModuleDescriptor[], options?: GlobalGraphOptions): Promise<GlobalGraph> {
    const graph = new GlobalGraph(options);
    for (const moduleDescriptor of moduleDescriptors) {
      const moduleNodeBuilder = new GlobalModuleNodeBuilder({
        name: moduleDescriptor.name,
        unitPath: moduleDescriptor.unitPath,
        optional: moduleDescriptor.optional ?? false,
      });
      for (const clazz of moduleDescriptor.clazzList) {
        moduleNodeBuilder.addClazz(clazz);
      }
      for (const clazz of moduleDescriptor.multiInstanceClazzList) {
        await moduleNodeBuilder.addMultiInstanceClazz(clazz, moduleDescriptor.name, moduleDescriptor.unitPath);
      }
      graph.addModuleNode(moduleNodeBuilder.build());
    }
    return graph;
  }
}
