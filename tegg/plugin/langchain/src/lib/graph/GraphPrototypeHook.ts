import {
  ChatCheckpointSaverInjectName,
  ChatCheckpointSaverQualifierAttribute,
  GraphEdgeInfoUtil,
  GraphInfoUtil,
  GraphNodeInfoUtil,
  GraphToolInfoUtil,
} from '@eggjs/langchain-decorator';
import { MCPClientInjectName, MCPClientQualifierAttribute } from '@eggjs/mcp-client';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/metadata';
import type { EggProtoImplClass, LifecycleHook } from '@eggjs/tegg';
import { BaseCheckpointSaver } from '@langchain/langgraph';

export class GraphPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  toolProtoMap: Map<EggProtoImplClass, EggPrototype> = new Map();
  nodeProtoMap: Map<EggPrototype, EggProtoImplClass[]> = new Map();
  nodeMcpServerProtoMap: Map<EggPrototype, string[]> = new Map();
  mcpServerProto: EggPrototype;

  checkPointProto: EggPrototype;
  checkPointList: EggProtoImplClass[] = [];
  checkPointProtoMap: Map<EggProtoImplClass, EggPrototype> = new Map();
  checkPointGraphMap: Map<EggProtoImplClass, EggPrototype[]> = new Map();
  graphCheckpointProtoMap: Map<EggPrototype, string> = new Map();

  graphNodeProtoMap: Map<EggPrototype, EggProtoImplClass[]> = new Map();
  nodeProto: Map<EggProtoImplClass, EggPrototype> = new Map();

  graphEdgeProtoMap: Map<EggPrototype, EggProtoImplClass[]> = new Map();
  edgeProto: Map<EggProtoImplClass, EggPrototype> = new Map();

  async postCreate(ctx: EggPrototypeLifecycleContext, proto: EggPrototype): Promise<void> {
    await this.makeNodeDependencies(ctx, proto);
    await this.makeGraphDependencies(ctx, proto);
  }

  async makeNodeDependencies(ctx: EggPrototypeLifecycleContext, proto: EggPrototype): Promise<void> {
    const nodeMetadata = GraphNodeInfoUtil.getGraphNodeMetadata(ctx.clazz);
    if (nodeMetadata) {
      const tools = nodeMetadata.tools ?? [];
      // 找到所有已经创建好的 tool proto
      for (let i = 0; i < tools.length; i++) {
        if (this.toolProtoMap.has(tools[i])) {
          const toolProto = this.toolProtoMap.get(tools[i])!;
          proto.injectObjects.push({
            refName: `__GRAPH_TOOL_${String(toolProto.name)}__`,
            objName: toolProto.name,
            qualifiers: [],
            proto: toolProto,
          });
        }
      }

      const mcpServers = nodeMetadata.mcpServers ?? [];
      if (this.mcpServerProto) {
        for (let i = 0; i < mcpServers.length; i++) {
          proto.injectObjects.push({
            refName: `__GRAPH_MCPSERVER_${String(mcpServers[i])}__`,
            objName: MCPClientInjectName,
            qualifiers: [
              {
                attribute: MCPClientQualifierAttribute,
                value: mcpServers[i],
              },
            ],
            proto: this.mcpServerProto,
          });
        }
      }

      // 存入 nodeProtoMap，等 tool 创建好了再注入
      this.nodeProtoMap.set(proto, tools);
      // 存入 nodeMcpServerProtoMap，等 mcpServer 创建好了再注入
      this.nodeMcpServerProtoMap.set(proto, mcpServers);
    }

    const toolMetadata = GraphToolInfoUtil.getGraphToolMetadata(ctx.clazz);
    if (toolMetadata) {
      // 注入到所有用到这个 tool 的 node 上
      for (const [nodeProto, toolClazzList] of this.nodeProtoMap.entries()) {
        if (toolClazzList.includes(ctx.clazz)) {
          nodeProto.injectObjects.push({
            refName: `__GRAPH_TOOL_${String(proto.name)}__`,
            objName: proto.name,
            qualifiers: [],
            proto,
          });
        }
      }
      // 记录已经创建好的 tool proto，以便后续 node 注入
      this.toolProtoMap.set(ctx.clazz, proto);
    }

    if (proto.name === MCPClientInjectName) {
      this.mcpServerProto = proto;
      // 注入到所有用到 mcpServer 的 node 上
      for (const [nodeProto, mcpServers] of this.nodeMcpServerProtoMap.entries()) {
        for (let i = 0; i < mcpServers.length; i++) {
          nodeProto.injectObjects.push({
            refName: `__GRAPH_MCPSERVER_${String(mcpServers[i])}__`,
            objName: MCPClientInjectName,
            qualifiers: [
              {
                attribute: MCPClientQualifierAttribute,
                value: mcpServers[i],
              },
            ],
            proto,
          });
        }
      }
    }
  }

  async makeGraphDependencies(ctx: EggPrototypeLifecycleContext, proto: EggPrototype): Promise<void> {
    const graphMetadata = GraphInfoUtil.getGraphMetadata(ctx.clazz);
    if (graphMetadata) {
      if (graphMetadata.checkpoint) {
        // module.yml ChatCheckpointSaver
        if (typeof graphMetadata.checkpoint === 'string') {
          // 如果 ChatCheckpointSaver 已经创建好了，则直接注入
          if (this.checkPointProto) {
            proto.injectObjects.push({
              refName: 'checkpoint',
              objName: ChatCheckpointSaverInjectName,
              qualifiers: [
                {
                  attribute: ChatCheckpointSaverQualifierAttribute,
                  value: graphMetadata.checkpoint,
                },
              ],
              proto: this.checkPointProto,
            });
          }

          // 如果没有创建好，则记录下来，等 ChatCheckpointSaver 创建好了再注入
          this.graphCheckpointProtoMap.set(proto, graphMetadata.checkpoint);
        } else {
          // 用户自己编写的 CheckpointSaver class
          if (this.checkPointProtoMap.has(graphMetadata.checkpoint)) {
            // 如果已经创建好了，则直接注入
            const checkPointProto = this.checkPointProtoMap.get(graphMetadata.checkpoint)!;
            proto.injectObjects.push({
              refName: 'checkpoint',
              objName: checkPointProto.name,
              qualifiers: [],
              proto: checkPointProto,
            });
          }

          // 如果没有创建好，则记录下来，等 CheckpointSaver 创建好了再注入
          this.checkPointList.push(graphMetadata.checkpoint);
          if (this.checkPointGraphMap.has(graphMetadata.checkpoint)) {
            this.checkPointGraphMap.get(graphMetadata.checkpoint)!.push(proto);
          } else {
            this.checkPointGraphMap.set(graphMetadata.checkpoint, [proto]);
          }
        }

        this.graphNodeProtoMap.set(proto, []);
        this.graphEdgeProtoMap.set(proto, []);

        // 将所有 node 注入到 graph 上
        for (const nodeProto of graphMetadata.nodes ?? []) {
          // 如果有，则是扫描过了，直接注入
          if (this.nodeProto.has(nodeProto)) {
            proto.injectObjects.push({
              refName: `__GRAPH_NODE_${String(nodeProto)}__`,
              objName: nodeProto.name,
              qualifiers: [],
              proto: this.nodeProto.get(nodeProto)!,
            });
          } else {
            // 如果没有，记录下来，等 node 创建好了再注入
            this.graphNodeProtoMap.get(proto)!.push(nodeProto);
          }
        }

        // 将所有 edge 注入到 graph 上
        for (const edgeProto of graphMetadata.edges ?? []) {
          // 如果有，则是扫描过了，直接注入
          if (this.edgeProto.has(edgeProto)) {
            proto.injectObjects.push({
              refName: `__GRAPH_EDGE_${String(edgeProto)}__`,
              objName: edgeProto.name,
              qualifiers: [],
              proto: this.edgeProto.get(edgeProto)!,
            });
          } else {
            // 如果没有，记录下来，等 edge 创建好了再注入
            this.graphEdgeProtoMap.get(proto)!.push(edgeProto);
          }
        }
      }
    }

    // 此时创建的是 ChatCheckpointSaver
    if (proto.name === ChatCheckpointSaverInjectName) {
      this.checkPointProto = proto;
      // 注入到所有用到 checkpoint 的 graph 上
      for (const [graphProto, checkpoint] of this.graphCheckpointProtoMap.entries()) {
        if (checkpoint === graphMetadata?.checkpoint) {
          if (!graphProto.injectObjects.find((injectObject) => injectObject.refName === 'checkpoint')) {
            continue;
          }
          graphProto.injectObjects.push({
            refName: 'checkpoint',
            objName: ChatCheckpointSaverInjectName,
            qualifiers: [
              {
                attribute: ChatCheckpointSaverQualifierAttribute,
                value: checkpoint,
              },
            ],
            proto,
          });
        }
      }
    }

    // 此时创建的是用户自定义的 BaseCheckpointSaver 的子类
    if (BaseCheckpointSaver.isPrototypeOf(ctx.clazz)) {
      // 如果有 graph 依赖这个 CheckpointSaver，则注入
      const graphProto = this.checkPointGraphMap.get(ctx.clazz) ?? [];
      for (let i = 0; i < graphProto.length; i++) {
        if (!graphProto[i].injectObjects.find((injectObject) => injectObject.refName === 'checkpoint')) {
          continue;
        }
        graphProto[i].injectObjects.push({
          refName: 'checkpoint',
          objName: proto.name,
          qualifiers: [],
          proto,
        });
      }
      this.checkPointProtoMap.set(ctx.clazz, proto);
    }

    // 此时创建的是 graph node
    const nodeMeta = GraphNodeInfoUtil.getGraphNodeMetadata(ctx.clazz);
    if (nodeMeta) {
      this.nodeProto.set(ctx.clazz, proto);
      // 注入到所有依赖这个 graph node 的 graph
      for (const [graphProto, nodeProtos] of this.graphNodeProtoMap.entries()) {
        if (nodeProtos.includes(ctx.clazz)) {
          if (
            graphProto.injectObjects.find(
              (injectObject) => injectObject.refName === `__GRAPH_NODE_${String(ctx.clazz)}__`,
            )
          ) {
            continue;
          }
          graphProto.injectObjects.push({
            refName: `__GRAPH_NODE_${String(ctx.clazz)}__`,
            objName: proto.name,
            qualifiers: [],
            proto,
          });
        }
      }
    }

    // 此时创建的是 graph edge
    const edgeMeta = GraphEdgeInfoUtil.getGraphEdgeMetadata(ctx.clazz);
    if (edgeMeta) {
      this.edgeProto.set(ctx.clazz, proto);
      // 注入到所有依赖这个 graph edge 的 graph
      for (const [graphProto, edgeProtos] of this.graphEdgeProtoMap.entries()) {
        if (edgeProtos.includes(ctx.clazz)) {
          if (
            graphProto.injectObjects.find(
              (injectObject) => injectObject.refName === `__GRAPH_EDGE_${String(ctx.clazz)}__`,
            )
          ) {
            continue;
          }
          graphProto.injectObjects.push({
            refName: `__GRAPH_EDGE_${String(ctx.clazz)}__`,
            objName: proto.name,
            qualifiers: [],
            proto,
          });
        }
      }
    }
  }
}
