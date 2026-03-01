import type {
  CreateRunInput,
  MessageObject,
  MessageContentBlock,
  AgentStreamMessage,
  AgentStreamMessagePayload,
} from '@eggjs/controller-decorator';
import { AgentObjectType, MessageRole, MessageStatus, ContentBlockType } from '@eggjs/controller-decorator';

import type { RunUsage } from './RunBuilder.ts';
import { nowUnix, newMsgId } from './utils.ts';

/**
 * Convert an AgentStreamMessage's message payload into OpenAI MessageContentBlock[].
 */
export function toContentBlocks(msg: AgentStreamMessagePayload): MessageContentBlock[] {
  if (!msg) return [];
  const content = msg.content;
  if (typeof content === 'string') {
    return [{ type: ContentBlockType.Text, text: { value: content, annotations: [] } }];
  }
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === ContentBlockType.Text)
      .map((part) => ({ type: ContentBlockType.Text, text: { value: part.text, annotations: [] } }));
  }
  return [];
}

/**
 * Build a completed MessageObject from an AgentStreamMessage payload.
 */
export function toMessageObject(msg: AgentStreamMessagePayload, runId?: string): MessageObject {
  return {
    id: newMsgId(),
    object: AgentObjectType.ThreadMessage,
    created_at: nowUnix(),
    run_id: runId,
    role: MessageRole.Assistant,
    status: MessageStatus.Completed,
    content: toContentBlocks(msg),
  };
}

/**
 * Extract MessageObjects and accumulated usage from AgentStreamMessage objects.
 * Returns camelCase `RunUsage` for internal use; callers convert to snake_case at boundaries.
 */
export function extractFromStreamMessages(
  messages: AgentStreamMessage[],
  runId?: string,
): {
  output: MessageObject[];
  usage?: RunUsage;
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

  let usage: RunUsage | undefined;
  if (hasUsage) {
    usage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
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
    .filter(
      (m): m is typeof m & { role: Exclude<typeof m.role, typeof MessageRole.System> } => m.role !== MessageRole.System,
    )
    .map((m) => ({
      id: newMsgId(),
      object: AgentObjectType.ThreadMessage,
      created_at: nowUnix(),
      thread_id: threadId,
      role: m.role,
      status: MessageStatus.Completed,
      content:
        typeof m.content === 'string'
          ? [{ type: ContentBlockType.Text, text: { value: m.content, annotations: [] } }]
          : m.content.map((p) => ({ type: ContentBlockType.Text, text: { value: p.text, annotations: [] } })),
    }));
}
