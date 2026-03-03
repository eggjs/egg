// ===== Object types =====

export enum AgentObjectType {
  Thread = 'thread',
  ThreadRun = 'thread.run',
  ThreadMessage = 'thread.message',
  ThreadMessageDelta = 'thread.message.delta',
}

// ===== Message roles =====

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

// ===== Message statuses =====

export enum MessageStatus {
  InProgress = 'in_progress',
  Incomplete = 'incomplete',
  Completed = 'completed',
}

// ===== Content block types =====

export enum ContentBlockType {
  Text = 'text',
}

// ===== Input Message (what clients send in request body) =====

export interface InputMessage {
  role: MessageRole;
  content: string | InputContentPart[];
  metadata?: Record<string, unknown>;
}

export interface InputContentPart {
  type: ContentBlockType;
  text: string;
}

// ===== Output Message (OpenAI thread.message object) =====

export interface MessageObject {
  id: string; // "msg_xxx"
  object: AgentObjectType.ThreadMessage;
  created_at: number; // Unix seconds
  thread_id?: string;
  run_id?: string;
  role: Exclude<MessageRole, MessageRole.System>;
  status: MessageStatus;
  content: MessageContentBlock[];
  metadata?: Record<string, unknown>;
}

export interface TextContentBlock {
  type: ContentBlockType;
  text: { value: string; annotations: unknown[] };
}

export type MessageContentBlock = TextContentBlock;

// ===== Thread types =====

export interface ThreadObject {
  id: string; // "thread_xxx"
  object: AgentObjectType.Thread;
  created_at: number; // Unix seconds
  metadata: Record<string, unknown>;
}

export interface ThreadObjectWithMessages extends ThreadObject {
  messages: MessageObject[];
}

// ===== Run types =====

export enum RunStatus {
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Cancelling = 'cancelling',
  Expired = 'expired',
}

export interface RunObject {
  id: string; // "run_xxx"
  object: AgentObjectType.ThreadRun;
  created_at: number; // Unix seconds
  thread_id?: string;
  status: RunStatus;
  last_error?: { code: string; message: string } | null;
  started_at?: number | null;
  completed_at?: number | null;
  cancelled_at?: number | null;
  failed_at?: number | null;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  metadata?: Record<string, unknown>;
  output?: MessageObject[];
  config?: AgentRunConfig;
}

// ===== Request types =====

export interface CreateRunInput {
  thread_id?: string;
  input: {
    messages: InputMessage[];
  };
  config?: AgentRunConfig;
  metadata?: Record<string, unknown>;
}

// ===== SSE Delta type =====

export interface MessageDeltaObject {
  id: string;
  object: AgentObjectType.ThreadMessageDelta;
  delta: { content: MessageContentBlock[] };
}

// ===== SSE Event names =====

export enum AgentSSEEvent {
  ThreadRunCreated = 'thread.run.created',
  ThreadRunInProgress = 'thread.run.in_progress',
  ThreadRunCompleted = 'thread.run.completed',
  ThreadRunFailed = 'thread.run.failed',
  ThreadRunCancelled = 'thread.run.cancelled',
  ThreadMessageCreated = 'thread.message.created',
  ThreadMessageDelta = 'thread.message.delta',
  ThreadMessageCompleted = 'thread.message.completed',
  Done = 'done',
}

// ===== Error codes =====

export enum AgentErrorCode {
  ExecError = 'EXEC_ERROR',
}

// ===== Internal types =====

export type AgentStreamMessagePayload = AgentStreamMessage['message'];

export interface AgentRunUsage {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  duration_ms?: number;
}

export interface AgentRunConfig {
  max_iterations?: number;
  timeout_ms?: number;
}

export interface AgentStreamMessage {
  type: string;
  message?: { role: string; content: string | { type: string; text: string }[] };
  usage?: AgentRunUsage;
  [key: string]: unknown;
}
