import { debuglog } from 'node:util';

import { QualifierUtil } from '@eggjs/core-decorator';
import { FrameworkErrorFormatter } from '@eggjs/errors';
import { Graph, GraphNode, type ModuleReference } from '@eggjs/tegg-common-util';
import {
  InitTypeQualifierAttribute,
  type InjectObjectDescriptor,
  LoadUnitNameQualifierAttribute,
  ObjectInitType,
  type ProtoDescriptor,
  type QualifierInfo,
} from '@eggjs/tegg-types';

import { EggPrototypeNotFound, MultiPrototypeFound } from '../../errors.ts';
import type { ModuleDescriptor } from '../ModuleDescriptor.ts';
import { ModuleDependencyMeta, GlobalModuleNode } from './GlobalModuleNode.ts';
import { GlobalModuleNodeBuilder } from './GlobalModuleNodeBuilder.ts';
import { ProtoDependencyMeta, ProtoNode } from './ProtoNode.ts';

const debug = debuglog('tegg/core/metadata/model/graph/GlobalGraph');

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

  /**
   * The global instance used in ModuleLoadUnit
   */
  static instance?: GlobalGraph;

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

  #findDependencyProtoWithDefaultQualifiers(
    proto: ProtoDescriptor,
    injectObject: InjectObjectDescriptor,
    qualifiers: QualifierInfo[],
  ): GraphNode<ProtoNode, ProtoDependencyMeta>[] {
    // TODO perf O(n(proto count)*m(inject count)*n)
    const result: GraphNode<ProtoNode, ProtoDependencyMeta>[] = [];
    for (const node of this.protoGraph.nodes.values()) {
      if (
        node.val.selectProto({
          name: injectObject.objName,
          qualifiers: QualifierUtil.mergeQualifiers(injectObject.qualifiers, qualifiers),
          moduleName: proto.instanceModuleName,
        })
      ) {
        result.push(node);
      }
    }
    return result;
  }

  findDependencyProtoNode(
    proto: ProtoDescriptor,
    injectObject: InjectObjectDescriptor,
  ): GraphNode<ProtoNode, ProtoDependencyMeta> | undefined {
    // 1. find proto with request
    // 2. try to add Context qualifier to find
    // 3. try to add self init type qualifier to find
    const protos = this.#findDependencyProtoWithDefaultQualifiers(proto, injectObject, []);
    if (protos.length === 0) {
      return;
      // throw FrameworkErrorFormater.formatError(new EggPrototypeNotFound(injectObject.objName, proto.instanceModuleName));
    }
    if (protos.length === 1) {
      return protos[0];
    }

    const protoWithContext = this.#findDependencyProtoWithDefaultQualifiers(proto, injectObject, [
      {
        attribute: InitTypeQualifierAttribute,
        value: ObjectInitType.CONTEXT,
      },
    ]);
    if (protoWithContext.length === 1) {
      return protoWithContext[0];
    }

    const protoWithSelfInitType = this.#findDependencyProtoWithDefaultQualifiers(proto, injectObject, [
      {
        attribute: InitTypeQualifierAttribute,
        value: proto.initType,
      },
    ]);
    if (protoWithSelfInitType.length === 1) {
      return protoWithSelfInitType[0];
    }
    const loadUnitQualifier = injectObject.qualifiers.find((t) => t.attribute === LoadUnitNameQualifierAttribute);
    if (!loadUnitQualifier) {
      return this.findDependencyProtoNode(proto, {
        ...injectObject,
        qualifiers: QualifierUtil.mergeQualifiers(injectObject.qualifiers, [
          {
            attribute: LoadUnitNameQualifierAttribute,
            value: proto.instanceModuleName,
          },
        ]),
      });
    }
    throw FrameworkErrorFormatter.formatError(new MultiPrototypeFound(injectObject.objName, injectObject.qualifiers));
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
