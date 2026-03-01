import { AgentController } from '@eggjs/tegg/agent';
import type { AgentHandler, CreateRunInput, AgentStreamMessage } from '@eggjs/tegg/agent';

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      },
      { once: true },
    );
  });
}

@AgentController()
export class BaseAgentController implements AgentHandler {
  async *execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage> {
    const messages = input.input.messages;

    // If the first message asks to cancel, add a delay so cancel tests can catch it
    if (messages[0]?.content === 'cancel me') {
      await sleep(2000, signal);
    }

    yield {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: `Processed ${messages.length} messages` }],
      },
    };
    yield {
      type: 'result',
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };
  }
}
