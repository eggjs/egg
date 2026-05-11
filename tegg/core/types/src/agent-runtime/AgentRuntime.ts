import type { InputContentPart, MessageContentBlock } from './AgentMessage.ts';
import type { AgentRunConfig, InputMessage, MessageObject, RunStatus } from './AgentStore.ts';

export { ContentBlockType } from './AgentMessage.ts';
export type { InputContentPart, MessageContentBlock, TextContentBlock } from './AgentMessage.ts';

// ===== Message roles =====

export const MessageRole = {
  User: 'user',
  Assistant: 'assistant',
  System: 'system',
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

// ===== Message statuses =====

export const MessageStatus = {
  InProgress: 'in_progress',
  Incomplete: 'incomplete',
  Completed: 'completed',
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

// ===== SSE events =====

export const AgentSSEEvent = {
  ThreadRunCreated: 'thread.run.created',
  ThreadRunInProgress: 'thread.run.in_progress',
  ThreadRunCompleted: 'thread.run.completed',
  ThreadRunFailed: 'thread.run.failed',
  ThreadRunCancelled: 'thread.run.cancelled',
  ThreadMessageCreated: 'thread.message.created',
  ThreadMessageDelta: 'thread.message.delta',
  ThreadMessageCompleted: 'thread.message.completed',
  Done: 'done',
} as const;
export type AgentSSEEvent = (typeof AgentSSEEvent)[keyof typeof AgentSSEEvent];

// ===== Error codes =====

export const AgentErrorCode = {
  ExecError: 'EXEC_ERROR',
} as const;
export type AgentErrorCode = (typeof AgentErrorCode)[keyof typeof AgentErrorCode];

// ===== Thread objects =====

export interface ThreadObject {
  id: string;
  object: 'thread';
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface ThreadObjectWithMessages extends ThreadObject {
  messages: MessageObject[];
}

// ===== Run objects =====

export interface RunObject {
  id: string;
  object: 'thread.run';
  createdAt: number;
  threadId: string;
  status: RunStatus;
  lastError?: { code: string; message: string } | null;
  startedAt?: number | null;
  completedAt?: number | null;
  cancelledAt?: number | null;
  failedAt?: number | null;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  metadata?: Record<string, unknown>;
  output?: MessageObject[];
  config?: AgentRunConfig;
}

// ===== Run input =====

export interface CreateRunInput {
  threadId?: string;
  input: {
    messages: InputMessage[];
  };
  config?: AgentRunConfig;
  metadata?: Record<string, unknown>;
}

// ===== Thread input =====

/**
 * Options for {@link AgentRuntime.createThread}.
 *
 * `metadata` is forwarded verbatim to {@link AgentStore.createThread} so callers
 * can persist additional business semantics on the thread record (e.g. the
 * resolved agent name, owning sandbox id, trace id). It is stored once at
 * creation time and never overwritten by subsequent runs on the same thread.
 */
export interface CreateThreadOptions {
  metadata?: Record<string, unknown>;
}

/**
 * Options consumed by `AgentRuntime.ensureThread` when it has to auto-create
 * a thread because no `threadId` was supplied. When a `threadId` is already
 * present the options are ignored — resume must never mutate existing thread
 * metadata, even if the caller passes a different value.
 */
export interface EnsureThreadOptions {
  metadata?: Record<string, unknown>;
}

// ===== Message delta =====

export interface MessageDeltaObject {
  id: string;
  object: 'thread.message.delta';
  delta: {
    content: MessageContentBlock[];
  };
}

// ===== Stream message types =====

export interface AgentStreamMessagePayload {
  role?: string;
  content: string | InputContentPart[];
}

export interface AgentRunUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface AgentStreamMessage {
  type?: string;
  message?: AgentStreamMessagePayload;
  usage?: AgentRunUsage;
}
