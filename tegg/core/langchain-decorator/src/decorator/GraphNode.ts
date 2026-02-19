import { SingletonProto, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { AccessLevel } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { AnnotationRoot, StateGraph } from '@langchain/langgraph';
import type { Runtime, StateDefinition, UpdateType } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseChatOpenAI } from '@langchain/openai';
import { ConfigurableModel } from 'langchain/chat_models/universal';

import type { IGraphNodeMetadata } from '../model/GraphNodeMetadata.ts';
import { GraphNodeInfoUtil } from '../util/GraphNodeInfoUtil.ts';

export function GraphNode<S extends StateDefinition = StateDefinition>(params: IGraphNodeMetadata) {
  return (constructor: EggProtoImplClass<IGraphNode<S> | TeggToolNode>) => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    GraphNodeInfoUtil.setGraphNodeMetadata(params, constructor);
  };
}

export type StateGraphAddNodeOptions = Parameters<(typeof StateGraph)['prototype']['addNode']>[2];

export type GraphRuntime<ContextType = Record<string, unknown>, InterruptType = any, WriterType = any> = Runtime<
  ContextType,
  InterruptType,
  WriterType
>;

export interface IGraphNode<S extends StateDefinition = StateDefinition, T = any> {
  options?: StateGraphAddNodeOptions;
  execute(
    state: AnnotationRoot<S>['State'],
    options?: GraphRuntime,
  ): Promise<UpdateType<S> & Record<string, any>> | Promise<ToolNode<T>>;
  build?: (
    tools: Parameters<ConfigurableModel['bindTools']>['0'],
  ) => Promise<ReturnType<ConfigurableModel['bindTools']> | ReturnType<BaseChatOpenAI<any>['bindTools']>>;
}

export class TeggToolNode implements IGraphNode {
  toolNode: ToolNode;

  async execute() {
    return this.toolNode;
  }
}
