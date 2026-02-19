import {
  ChatModelQualifier,
  IGraphStructuredTool,
  TeggBoundModel,
  TeggCompiledStateGraph,
} from '@eggjs/langchain-decorator';
import { HTTPController, HTTPMethod, HTTPMethodEnum, Inject } from '@eggjs/tegg';
import { AIMessage } from 'langchain';

import { ChatOpenAIModel } from '../../../../../../../../lib/ChatOpenAI';
import { BoundChatModel } from '../service/BoundChatModel';
import { FooGraph, FooTool } from '../service/Graph';

@HTTPController({
  path: '/llm',
})
export class AppController {
  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAIModel;

  @Inject()
  boundChatModel: TeggBoundModel<BoundChatModel>;

  @Inject()
  compiledFooGraph: TeggCompiledStateGraph<FooGraph>;

  @Inject()
  structuredFooTool: IGraphStructuredTool<FooTool>;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello() {
    const res = await this.chatModel.invoke('hello');
    return res;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/bound-chat',
  })
  async boundChat() {
    const res = await this.boundChatModel.invoke('hello');
    return res;
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/graph' })
  async get() {
    const res = await this.compiledFooGraph.invoke(
      {
        messages: [],
        aggregate: [],
      },
      {
        configurable: {
          thread_id: '1',
        },
        tags: ['trace-log'],
      },
    );

    return {
      value: res.messages
        .filter((msg) => AIMessage.prototype.isPrototypeOf(msg))
        .reduce((pre, cur) => {
          return cur.content + pre;
        }, ''),
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/structured' })
  async structured() {
    return {
      name: this.structuredFooTool.name,
      description: this.structuredFooTool.description,
    };
  }
}
