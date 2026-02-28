import type {
  CreateRunInput,
  MessageObject,
  MessageContentBlock,
  AgentStreamMessage,
  AgentStreamMessagePayload,
} from '@eggjs/controller-decorator';

import { nowUnix, newMsgId } from './utils.ts';

/**
 * Convert an AgentStreamMessage's message payload into OpenAI MessageContentBlock[].
 */
export function toContentBlocks(msg: AgentStreamMessagePayload): MessageContentBlock[] {
  if (!msg) return [];
  const content = msg.content;
  if (typeof content === 'string') {
    return [{ type: 'text', text: { value: content, annotations: [] } }];
  }
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text')
      .map((part) => ({ type: 'text' as const, text: { value: part.text, annotations: [] } }));
  }
  return [];
}

/**
 * Build a completed MessageObject from an AgentStreamMessage payload.
 */
export function toMessageObject(msg: AgentStreamMessagePayload, runId?: string): MessageObject {
  return {
    id: newMsgId(),
    object: 'thread.message',
    created_at: nowUnix(),
    run_id: runId,
    role: 'assistant',
    status: 'completed',
    content: toContentBlocks(msg),
  };
}

/**
 * Extract MessageObjects and accumulated usage from AgentStreamMessage objects.
 */
export function extractFromStreamMessages(
  messages: AgentStreamMessage[],
  runId?: string,
): {
  output: MessageObject[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
} {
  const output: MessageObject[] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let hasUsage = false;

  for (const msg of messages) {
    if (msg.message) {
      output.push(toMessageObject(msg.message, runId));
    }
    if (msg.usage) {
      hasUsage = true;
      promptTokens += msg.usage.prompt_tokens ?? 0;
      completionTokens += msg.usage.completion_tokens ?? 0;
    }
  }

  let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
  if (hasUsage) {
    usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
  }

  return { output, usage };
}

/**
 * Convert input messages to MessageObjects for thread history.
 * System messages are filtered out — they are transient instructions, not conversation history.
 */
export function toInputMessageObjects(
  messages: CreateRunInput['input']['messages'],
  threadId?: string,
): MessageObject[] {
  return messages
    .filter((m): m is typeof m & { role: 'user' | 'assistant' } => m.role !== 'system')
    .map((m) => ({
      id: newMsgId(),
      object: 'thread.message' as const,
      created_at: nowUnix(),
      thread_id: threadId,
      role: m.role,
      status: 'completed' as const,
      content:
        typeof m.content === 'string'
          ? [{ type: 'text' as const, text: { value: m.content, annotations: [] } }]
          : m.content.map((p) => ({ type: 'text' as const, text: { value: p.text, annotations: [] } })),
    }));
}
