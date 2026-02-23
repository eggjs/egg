import { BoundModel } from '@eggjs/langchain-decorator';

import { FooTool } from './Graph';

@BoundModel({
  modelName: 'chat',
  tools: [FooTool],
  mcpServers: ['bar'],
})
export class BoundChatModel {}
