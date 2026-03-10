import type { CreateRunInput, AgentStreamMessage } from '@eggjs/tegg-types/agent-runtime';

import { AgentController } from '../../src/decorator/agent/AgentController.ts';
import type { AgentHandler } from '../../src/decorator/agent/AgentHandler.ts';

// AgentController that only implements execRun (smart defaults pattern)
@AgentController()
export class AgentFooController implements AgentHandler {
  async createStore(): Promise<unknown> {
    return new Map();
  }

  async *execRun(input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
    const messages = input.input.messages;
    yield {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: `Processed ${messages.length} messages` }],
      },
    };
  }
}
