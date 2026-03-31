import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';
import { ChatOpenAI } from '@langchain/openai';

import { ChatModelQualifier } from '../../../../src/index.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo {
  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAI;
}
