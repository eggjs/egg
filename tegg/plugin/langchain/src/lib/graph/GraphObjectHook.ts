import {
  ChatModelInjectName,
  ChatModelQualifierAttribute,
  GRAPH_NODE_METADATA,
  TeggToolNode,
  GraphToolInfoUtil,
} from '@eggjs/langchain-decorator';
import type { IGraphNode, IGraphTool, GraphNodeMetadata } from '@eggjs/langchain-decorator';
import { MCPClientInjectName, MCPClientQualifierAttribute } from '@eggjs/mcp-client';
import { MCPInfoUtil } from '@eggjs/tegg';
import type { LifecycleHook } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg/helper';
import type { EggObjectLifeCycleContext, EggObject, EggPrototypeWithClazz } from '@eggjs/tegg/helper';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { DynamicStructuredTool } from 'langchain';
import { ConfigurableModel } from 'langchain/chat_models/universal';
import * as z from 'zod/v4';

class GraphNodeHandler {
  nodeMetadata: GraphNodeMetadata;
  eggObject: EggObject;

  constructor(nodeMetadata: GraphNodeMetadata, eggObject: EggObject) {
    this.nodeMetadata = nodeMetadata;
    this.eggObject = eggObject;
  }

  async findGraphTools() {
    const tools = this.nodeMetadata.tools ?? [];
    let dTools: Parameters<ConfigurableModel['bindTools']>['0'] = [];
    for (let i = 0; i < tools.length; i++) {
      const toolsObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(tools[i]);
      const toolMetadata = GraphToolInfoUtil.getGraphToolMetadata(
        (toolsObj.proto as unknown as EggPrototypeWithClazz).clazz!,
      );
      const ToolDetail = MCPInfoUtil.getMCPToolArgsIndex(
        (toolsObj.proto as unknown as EggPrototypeWithClazz).clazz!,
        'execute',
      );
      if (toolMetadata && ToolDetail) {
        const tool = new DynamicStructuredTool({
          description: toolMetadata.description,
          name: toolMetadata.toolName,
          func: (toolsObj.obj as unknown as IGraphTool<any>).execute.bind(toolsObj.obj) as any,
          schema: z.object(ToolDetail.argsSchema) as any,
        });
        dTools = dTools.concat(tool);
      }
    }

    return dTools;
  }

  async findMcpServerTools() {
    const mcpServers = this.nodeMetadata.mcpServers ?? [];
    let sTools: Parameters<ConfigurableModel['bindTools']>['0'] = [];
    for (let i = 0; i < mcpServers.length; i++) {
      const mcpClientObj = await EggContainerFactory.getOrCreateEggObjectFromName(MCPClientInjectName, [
        {
          attribute: MCPClientQualifierAttribute,
          value: mcpServers[i],
        },
      ]);
      const tool = await loadMcpTools(mcpServers[i], mcpClientObj.obj as any, {
        throwOnLoadError: true,
        prefixToolNameWithServerName: false,
        additionalToolNamePrefix: '',
      });
      sTools = sTools.concat(tool);
    }
    return sTools;
  }

  async boundTools() {
    const nodeObj = this.eggObject.obj as IGraphNode<any>;
    const dTools = await this.findGraphTools();
    const sTools = await this.findMcpServerTools();

    if (TeggToolNode.prototype.isPrototypeOf(nodeObj)) {
      const toolNode = new ToolNode([...(dTools as DynamicStructuredTool[]), ...(sTools as DynamicStructuredTool[])]);
      Object.defineProperty(nodeObj, 'toolNode', {
        get: () => toolNode,
      });
      return;
    }

    // 如果用户写了 build 方法，则让他自己绑定
    if (nodeObj.build) {
      nodeObj.build!([...dTools, ...sTools]);
    } else {
      // 否则自动绑定
      const injectObjects = this.eggObject.proto.injectObjects;
      for (let i = 0; i < injectObjects.length; i++) {
        const injectObject = injectObjects[i];
        const qualifiers = injectObject.qualifiers;
        for (let j = 0; j < qualifiers.length; j++) {
          const qualifier = qualifiers[j];
          if (qualifier.attribute === ChatModelQualifierAttribute) {
            // 找到当前 eggObject 上的 chatModel
            const chatModelObj = await EggContainerFactory.getOrCreateEggObjectFromName(ChatModelInjectName, [
              {
                attribute: ChatModelQualifierAttribute,
                value: qualifier.value,
              },
            ]);
            const chatModel = chatModelObj.obj as ConfigurableModel;
            // 绑定
            const boundChatModel = chatModel.bindTools([...dTools, ...sTools]);
            // 劫持
            Object.defineProperty(nodeObj, injectObject.objName, {
              get: () => boundChatModel,
            });
          }
        }
      }
    }
  }
}

export class GraphObjectHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  async postCreate(_: EggObjectLifeCycleContext, eggObject: EggObject): Promise<void> {
    const nodeMetadata = eggObject.proto.getMetaData<GraphNodeMetadata>(GRAPH_NODE_METADATA);
    // 找到 graph node
    if (nodeMetadata) {
      const handler = new GraphNodeHandler(nodeMetadata, eggObject);
      await handler.boundTools();
      return;
    }
  }
}
