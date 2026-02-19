import {
  ChatModelInjectName,
  ChatModelQualifierAttribute,
  BOUND_MODEL_METADATA,
  GraphToolInfoUtil,
} from '@eggjs/langchain-decorator';
import type { IGraphNode, IGraphTool, IBoundModelMetadata } from '@eggjs/langchain-decorator';
import { MCPClientInjectName, MCPClientQualifierAttribute } from '@eggjs/mcp-client';
import { MCPInfoUtil } from '@eggjs/tegg';
import type { LifecycleHook } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import type { EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg-runtime';
import type { EggPrototypeWithClazz } from '@eggjs/tegg/helper';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { DynamicStructuredTool } from 'langchain';
import { ConfigurableModel } from 'langchain/chat_models/universal';
import * as z from 'zod/v4';

class BoundModelHandler {
  boundModelMetadata: IBoundModelMetadata;
  eggObject: EggObject;

  constructor(nodeMetadata: IBoundModelMetadata, eggObject: EggObject) {
    this.boundModelMetadata = nodeMetadata;
    this.eggObject = eggObject;
  }

  async findGraphTools() {
    const tools = this.boundModelMetadata.tools ?? [];
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
          func: (toolsObj.obj as unknown as IGraphTool<any>).execute.bind(toolsObj.obj),
          schema: z.object(ToolDetail.argsSchema) as any,
        });
        dTools = dTools.concat(tool);
      }
    }

    return dTools;
  }

  async findMcpServerTools() {
    const mcpServers = this.boundModelMetadata.mcpServers ?? [];
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

    const chatModelObj = await EggContainerFactory.getOrCreateEggObjectFromName(ChatModelInjectName, [
      {
        attribute: ChatModelQualifierAttribute,
        value: this.boundModelMetadata.modelName,
      },
    ]);
    const chatModel = chatModelObj.obj as ConfigurableModel;

    const boundChatModel = chatModel.bindTools([...dTools, ...sTools]);

    Object.setPrototypeOf(Object.getPrototypeOf(nodeObj), boundChatModel);
  }
}

export class BoundModelObjectHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  async postCreate(_: EggObjectLifeCycleContext, eggObject: EggObject) {
    const BoundModelMetadata = eggObject.proto.getMetaData<IBoundModelMetadata>(BOUND_MODEL_METADATA);
    // 找到 graph node
    if (BoundModelMetadata) {
      const handler = new BoundModelHandler(BoundModelMetadata, eggObject);
      await handler.boundTools();
      return;
    }
  }
}
