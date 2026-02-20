import {
  ChatCheckpointSaverInjectName,
  ChatCheckpointSaverQualifierAttribute,
  GRAPH_EDGE_METADATA,
  GRAPH_NODE_METADATA,
  TeggToolNode,
} from '@eggjs/langchain-decorator';
import type {
  GraphEdgeMetadata,
  GraphMetadata,
  GraphNodeMetadata,
  IGraph,
  IGraphEdge,
  IGraphNode,
} from '@eggjs/langchain-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { EGG_CONTEXT } from '@eggjs/module-common';
import { IdenticalUtil } from '@eggjs/tegg';
import type { EggObjectName, EggPrototypeName, Id } from '@eggjs/tegg';
import { ContextHandler, EggContainerFactory, EggObjectStatus } from '@eggjs/tegg-runtime';
import type { EggContext, EggObject } from '@eggjs/tegg-runtime';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';

import { LangGraphTracer } from '../tracing/LangGraphTracer.ts';
import { CompiledStateGraphProto } from './CompiledStateGraphProto.ts';

export class CompiledStateGraphObject implements EggObject {
  private status: EggObjectStatus = EggObjectStatus.PENDING;
  id: Id;
  readonly name: EggPrototypeName;
  readonly proto: CompiledStateGraphProto;
  readonly ctx: EggContext;
  readonly daoName: string;
  private _obj: object;
  readonly graphMetadata: GraphMetadata;
  readonly graphName: string;

  constructor(name: EggObjectName, proto: CompiledStateGraphProto) {
    this.name = name;
    this.proto = proto;
    this.ctx = ContextHandler.getContext()!;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
    this.graphMetadata = proto.graphMetadata;
    this.graphName = proto.graphName;
  }

  async init(): Promise<void> {
    this._obj = await this.build();
    const graph = this._obj as CompiledStateGraph<any, any>;

    const originalStream = graph.stream;
    const langGraphTraceObj = await EggContainerFactory.getOrCreateEggObjectFromName('langGraphTracer');
    const tracer = langGraphTraceObj.obj as LangGraphTracer;
    tracer.setName(this.graphName);
    graph.stream = (input: any, config?: any) => this.wrapGraphMethod(originalStream.bind(graph), input, config);

    this.status = EggObjectStatus.READY;
  }

  async build(): Promise<any> {
    const stateGraph = await EggContainerFactory.getOrCreateEggObjectFromName(this.graphName);
    await this.boundNodes(stateGraph);
    await this.boundEdges(stateGraph);
    const graphObj = stateGraph.obj as IGraph<any, any>;
    const checkpoint = this.graphMetadata.checkpoint;
    let compileGraph;
    if (checkpoint) {
      let checkpointObj: EggObject;
      if (typeof checkpoint !== 'string') {
        checkpointObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(checkpoint);
      } else {
        checkpointObj = await EggContainerFactory.getOrCreateEggObjectFromName(ChatCheckpointSaverInjectName, [
          {
            attribute: ChatCheckpointSaverQualifierAttribute,
            value: checkpoint,
          },
        ]);
      }
      compileGraph = graphObj.compile({
        checkpointer: checkpointObj.obj as BaseCheckpointSaver as any,
      });
    } else {
      compileGraph = graphObj.compile();
    }
    return compileGraph;
  }

  async boundNodes(stateGraph: EggObject): Promise<void> {
    const graphObj = stateGraph.obj as IGraph<any, any>;
    const nodes = this.graphMetadata.nodes ?? [];
    for (let i = 0; i < nodes.length; i++) {
      const node = await EggContainerFactory.getOrCreateEggObjectFromClazz(nodes[i]);
      const nodeObj = node.obj as unknown as IGraphNode<any>;
      const nodeMetadata = node.proto.getMetaData<GraphNodeMetadata>(GRAPH_NODE_METADATA);
      if (nodeMetadata) {
        if (TeggToolNode.prototype.isPrototypeOf(nodeObj)) {
          graphObj.addNode(nodeMetadata.nodeName, (nodeObj as unknown as TeggToolNode).toolNode);
        } else {
          graphObj.addNode(nodeMetadata.nodeName, nodeObj.execute.bind(nodeObj), nodeObj.options);
        }
      }
    }
  }

  async boundEdges(stateGraph: EggObject): Promise<void> {
    const graphObj = stateGraph.obj as IGraph<any, any>;
    const edges = this.graphMetadata.edges ?? [];
    for (let i = 0; i < edges.length; i++) {
      const edge = await EggContainerFactory.getOrCreateEggObjectFromClazz(edges[i]);
      const edgeObj = edge.obj as unknown as IGraphEdge<any>;
      const edgeMetadata = edge.proto.getMetaData<GraphEdgeMetadata>(GRAPH_EDGE_METADATA);
      if (edgeMetadata) {
        if (edgeObj.execute) {
          graphObj.addConditionalEdges(
            edgeMetadata.fromNodeName,
            edgeObj.execute.bind(edgeObj),
            edgeMetadata.toNodeNames,
          );
        } else {
          graphObj.addEdge(edgeMetadata.fromNodeName, edgeMetadata.toNodeNames[0]);
        }
      }
    }
  }

  /**
   * 包装 graph 方法，添加 tracing
   */
  async wrapGraphMethod(
    originalMethod: (input: any, config?: any) => Promise<any>,
    input: any,
    config?: any,
  ): Promise<any> {
    // 确保 config 对象存在
    const finalConfig = config || {};

    // 准备 tracer
    const shouldTrace = finalConfig.tags?.includes('trace-log');
    if (shouldTrace) {
      const langGraphTraceObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(LangGraphTracer);
      const tracer = langGraphTraceObj.obj as LangGraphTracer;
      tracer.setName(this.graphName);

      finalConfig.callbacks = [tracer, ...(finalConfig.callbacks || [])];
    }

    // 设置 runId
    if (!finalConfig.runId) {
      const trace = await this.getTracer();
      finalConfig.runId = trace?.traceId;
    }

    return await originalMethod(input, finalConfig);
  }

  async getTracer(): Promise<any> {
    const ctx = ContextHandler.getContext()!.get(EGG_CONTEXT);
    return ctx.tracer;
  }

  injectProperty(): never {
    throw new Error('never call GraphObject#injectProperty');
  }

  get isReady(): boolean {
    return this.status === EggObjectStatus.READY;
  }

  get obj(): object {
    return this._obj;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<CompiledStateGraphObject> {
    const compiledStateGraphObject = new CompiledStateGraphObject(name, proto as unknown as CompiledStateGraphProto);
    await compiledStateGraphObject.init();
    return compiledStateGraphObject;
  }
}
