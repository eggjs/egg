import assert from 'node:assert';

import { GraphInfoUtil, GraphToolInfoUtil } from '@eggjs/langchain-decorator';
import type { IGraphMetadata, IGraphTool, IGraphToolMetadata } from '@eggjs/langchain-decorator';
import { EggPrototypeCreatorFactory, EggPrototypeFactory, ProtoDescriptorHelper } from '@eggjs/metadata';
import type { ClassProtoDescriptor, EggPrototypeWithClazz, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/metadata';
import { AccessLevel, LifecyclePostInject, MCPInfoUtil, SingletonProto } from '@eggjs/tegg';
import type { EggProtoImplClass, LifecycleHook } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { DynamicStructuredTool } from 'langchain';
import * as z from 'zod/v4';

import { CompiledStateGraphProto } from './CompiledStateGraphProto.ts';

export class GraphLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly eggPrototypeFactory: EggPrototypeFactory;
  clazzMap: Map<EggProtoImplClass, IGraphMetadata>;
  graphCompiledNameMap: Map<string, CompiledStateGraphProto> = new Map();
  tools: Map<EggProtoImplClass, IGraphToolMetadata>;

  constructor(eggPrototypeFactory: EggPrototypeFactory) {
    this.eggPrototypeFactory = eggPrototypeFactory;
    this.clazzMap = GraphInfoUtil.getAllGraphMetadata();
    this.tools = GraphToolInfoUtil.getAllGraphToolMetadata();
  }

  async preCreate(ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const clazzList = await ctx.loader.load();
    for (const clazz of clazzList) {
      const meta = this.clazzMap.get(clazz as EggProtoImplClass);
      if (meta) {
        const protoName = clazz.name[0].toLowerCase() + clazz.name.substring(1);
        const graphMetadata = GraphInfoUtil.getGraphMetadata(clazz as EggProtoImplClass);
        assert(graphMetadata, `${clazz.name} graphMetadata should not be null`);
        const proto = new CompiledStateGraphProto(
          loadUnit,
          `compiled${protoName.replace(protoName[0], protoName[0].toUpperCase())}`,
          protoName,
          graphMetadata,
        );
        this.eggPrototypeFactory.registerPrototype(proto as any, loadUnit);
        this.graphCompiledNameMap.set(protoName, proto);
      }
      const toolMeta = this.tools.get(clazz as EggProtoImplClass);
      if (toolMeta) {
        const StructuredTool = this.createStructuredTool(clazz, toolMeta);
        const protoDescriptor = ProtoDescriptorHelper.createByInstanceClazz(StructuredTool, {
          moduleName: loadUnit.name,
          unitPath: loadUnit.unitPath,
        }) as ClassProtoDescriptor;
        const proto = await EggPrototypeCreatorFactory.createProtoByDescriptor(protoDescriptor, loadUnit);
        this.eggPrototypeFactory.registerPrototype(proto, loadUnit);
      }
    }
  }

  createStructuredTool(clazz: EggProtoImplClass, toolMeta: IGraphToolMetadata): EggProtoImplClass {
    class StructuredTool {
      @LifecyclePostInject()
      async init() {
        const toolsObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
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
          Object.setPrototypeOf(this, tool);
        } else {
          throw new Error(`graph tool ${toolMeta.name ?? clazz.name} not found`);
        }
      }
    }
    SingletonProto({ name: `structured${toolMeta.name ?? clazz.name}`, accessLevel: AccessLevel.PUBLIC })(
      StructuredTool,
    );
    return StructuredTool;
  }

  async postCreate(_ctx: LoadUnitLifecycleContext, obj: LoadUnit): Promise<void> {
    for (const graphName of this.graphCompiledNameMap.keys()) {
      const graphProto = obj.getEggPrototype(graphName, [])[0];
      if (graphProto) {
        const compiledGraphProto = this.graphCompiledNameMap.get(graphName) as CompiledStateGraphProto;
        if (!compiledGraphProto.injectObjects.find((injectObject) => injectObject.objName === graphProto.name)) {
          compiledGraphProto.injectObjects.push({
            refName: 'stateGraph',
            objName: graphProto.name,
            qualifiers: [],
            proto: graphProto,
          });
        }
      }
    }
  }
}
