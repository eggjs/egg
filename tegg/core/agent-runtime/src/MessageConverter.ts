import type {
  CreateRunInput,
  MessageObject,
  MessageContentBlock,
  AgentStreamMessage,
  AgentStreamMessagePayload,
} from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, MessageRole, MessageStatus, ContentBlockType } from '@eggjs/tegg-types/agent-runtime';

import { nowUnix, newMsgId } from './AgentStoreUtils.ts';
import type { RunUsage } from './RunBuilder.ts';

export class MessageConverter {
  /**
   * Convert an AgentStreamMessage's message payload into OpenAI MessageContentBlock[].
   */
  static toContentBlocks(msg: AgentStreamMessagePayload): MessageContentBlock[] {
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
  static toMessageObject(msg: AgentStreamMessagePayload, runId?: string): MessageObject {
    return {
      id: newMsgId(),
      object: AgentObjectType.ThreadMessage,
      createdAt: nowUnix(),
      runId,
      role: MessageRole.Assistant,
      status: MessageStatus.Completed,
      content: MessageConverter.toContentBlocks(msg),
    };
  }

  /**
   * Extract MessageObjects and accumulated usage from AgentStreamMessage objects.
   */
  static extractFromStreamMessages(
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
        output.push(MessageConverter.toMessageObject(msg.message, runId));
      }
      if (msg.usage) {
        hasUsage = true;
        promptTokens += msg.usage.promptTokens ?? 0;
        completionTokens += msg.usage.completionTokens ?? 0;
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
   * Create an in-progress MessageObject for streaming (before content is known).
   */
  static createStreamMessage(msgId: string, runId: string): MessageObject {
    return {
      id: msgId,
      object: AgentObjectType.ThreadMessage,
      createdAt: nowUnix(),
      runId,
      role: MessageRole.Assistant,
      status: MessageStatus.InProgress,
      content: [],
    };
  }

  /**
   * Convert input messages to MessageObjects for thread history.
   * System messages are filtered out — they are transient instructions, not conversation history.
   */
  static toInputMessageObjects(messages: CreateRunInput['input']['messages'], threadId?: string): MessageObject[] {
    return messages
      .filter(
        (m): m is typeof m & { role: Exclude<typeof m.role, typeof MessageRole.System> } =>
          m.role !== MessageRole.System,
      )
      .map((m) => ({
        id: newMsgId(),
        object: AgentObjectType.ThreadMessage,
        createdAt: nowUnix(),
        threadId,
        role: m.role,
        status: MessageStatus.Completed,
        content:
          typeof m.content === 'string'
            ? [{ type: ContentBlockType.Text, text: { value: m.content, annotations: [] } }]
            : m.content.map((p) => ({ type: ContentBlockType.Text, text: { value: p.text, annotations: [] } })),
      }));
  }
}
