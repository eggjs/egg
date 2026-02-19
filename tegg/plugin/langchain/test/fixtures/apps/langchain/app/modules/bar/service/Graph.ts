import {
  Graph,
  GraphEdge,
  IGraphEdge,
  AbstractStateGraph,
  GraphNode,
  IGraphNode,
  GraphStateType,
  GraphTool,
  IGraphTool,
  TeggToolNode,
  GraphRuntime,
} from '@eggjs/langchain-decorator';
import { AccessLevel, Inject, Logger, SingletonProto, ToolArgs, ToolArgsSchema } from '@eggjs/tegg';
import { Annotation, MemorySaver } from '@langchain/langgraph';
import { AIMessage, BaseMessage, ToolMessage } from 'langchain';
// import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import * as z from 'zod/v4';

export enum FooGraphNodeName {
  START = '__start__',
  END = '__end__',
  ACTION = 'action',
  AGENT = 'agent',
  TOOLS = 'tools',
  NODE_A = 'a',
  NODE_B = 'b',
  NODE_C = 'c',
  NODE_D = 'd',
}

@SingletonProto()
export class FooSaver extends MemorySaver {}

// state
export const fooAnnotationStateDefinition = {
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  aggregate: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
  }),
};

export type fooAnnotationStateDefinitionType = typeof fooAnnotationStateDefinition;

export const ToolType = {
  query: z.string().describe('npm package name'),
};

@GraphTool({
  toolName: 'search',
  description: 'Call the foo tool',
})
export class FooTool implements IGraphTool {
  async execute(@ToolArgsSchema(ToolType) args: ToolArgs<typeof ToolType>) {
    console.log('query: ', args.query);
    return `hello ${args.query}`;
  }
}

@GraphNode({
  nodeName: FooGraphNodeName.ACTION,
  tools: [FooTool],
  mcpServers: ['bar'],
})
export class FooNode implements IGraphNode<fooAnnotationStateDefinitionType> {
  @Inject()
  logger: Logger;

  async execute(state: GraphStateType<fooAnnotationStateDefinitionType>, options: GraphRuntime) {
    this.logger.info('Executing FooNode thread_id is', options.configurable?.thread_id);
    console.log('response: ', state.messages);
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    if (ToolMessage.prototype.isPrototypeOf(lastMessage)) {
      return {
        messages: [new AIMessage(lastMessage!.text!)],
      };
    }
    return {
      messages: [
        new AIMessage({
          tool_calls: [
            {
              name: 'search',
              args: {
                query: 'graph tool',
              },
              id: 'fc-6b565ce5-e0cf-4af3-8ed0-0ca75c509d9e',
              type: 'tool_call',
            },
          ],
          content: 'hello world',
        }),
      ],
    };
  }
}

@GraphNode({
  nodeName: FooGraphNodeName.TOOLS,
  tools: [FooTool],
})
export class ToolNode extends TeggToolNode {}

@GraphEdge({
  fromNodeName: FooGraphNodeName.ACTION,
  toNodeNames: [FooGraphNodeName.TOOLS, FooGraphNodeName.END],
})
export class FooContinueEdge implements IGraphEdge<fooAnnotationStateDefinitionType, FooGraphNodeName> {
  async execute(state: GraphStateType<fooAnnotationStateDefinitionType>): Promise<FooGraphNodeName> {
    console.log('response: ', state.messages);
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (lastMessage?.tool_calls?.length) {
      return FooGraphNodeName.TOOLS;
    }
    return FooGraphNodeName.END;
  }
}

@GraphEdge({
  fromNodeName: FooGraphNodeName.TOOLS,
  toNodeNames: [FooGraphNodeName.ACTION],
})
export class ToolsContinueEdge implements IGraphEdge<fooAnnotationStateDefinitionType, FooGraphNodeName> {}

@GraphEdge({
  fromNodeName: FooGraphNodeName.START,
  toNodeNames: [FooGraphNodeName.ACTION],
})
export class FooStartContinueEdge implements IGraphEdge<fooAnnotationStateDefinitionType, FooGraphNodeName> {}

@Graph({
  accessLevel: AccessLevel.PUBLIC,
  nodes: [FooNode, ToolNode],
  edges: [FooContinueEdge, FooStartContinueEdge, ToolsContinueEdge],
  checkpoint: FooSaver,
})
export class FooGraph extends AbstractStateGraph<FooGraphNodeName, typeof fooAnnotationStateDefinition> {
  constructor() {
    super(fooAnnotationStateDefinition);
  }
}
