import { SingletonProto, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { AccessLevel } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolSchemaBase } from '@langchain/core/tools';

import type { IGraphToolMetadata } from '../model/GraphToolMetadata.ts';
import { GraphToolInfoUtil } from '../util/GraphToolInfoUtil.ts';

export function GraphTool<ToolSchema = ToolSchemaBase>(
  params: IGraphToolMetadata,
): (constructor: EggProtoImplClass<IGraphTool<ToolSchema>>) => void {
  return (constructor: EggProtoImplClass<IGraphTool<ToolSchema>>): void => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    GraphToolInfoUtil.setGraphToolMetadata(params, constructor);
  };
}

export interface IGraphTool<ToolSchema = ToolSchemaBase> {
  execute: DynamicStructuredTool<ToolSchema>['func'];
}

export type IGraphStructuredTool<T extends IGraphTool> = DynamicStructuredTool<Parameters<T['execute']>[0]>;
