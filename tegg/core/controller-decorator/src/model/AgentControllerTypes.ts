// ===== Input Message (what clients send in request body) =====

export interface InputMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | InputContentPart[];
  metadata?: Record<string, unknown>;
}

export interface InputContentPart {
  type: 'text';
  text: string;
}

// ===== Output Message (OpenAI thread.message object) =====

export interface MessageObject {
  id: string; // "msg_xxx"
  object: 'thread.message';
  created_at: number; // Unix seconds
  thread_id?: string;
  run_id?: string;
  role: 'user' | 'assistant';
  status: 'in_progress' | 'incomplete' | 'completed';
  content: MessageContentBlock[];
  metadata?: Record<string, unknown>;
}

export interface TextContentBlock {
  type: 'text';
  text: { value: string; annotations: unknown[] };
}

export type MessageContentBlock = TextContentBlock;

// ===== Thread types =====

export interface ThreadObject {
  id: string; // "thread_xxx"
  object: 'thread';
  created_at: number; // Unix seconds
  metadata: Record<string, unknown>;
}

export interface ThreadObjectWithMessages extends ThreadObject {
  messages: MessageObject[];
}

// ===== Run types =====

export const RunStatus = {
  Queued: 'queued',
  InProgress: 'in_progress',
  Completed: 'completed',
  Failed: 'failed',
  Cancelled: 'cancelled',
  Cancelling: 'cancelling',
  Expired: 'expired',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export interface RunObject {
  id: string; // "run_xxx"
  object: 'thread.run';
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
  object: 'thread.message.delta';
  delta: { content: MessageContentBlock[] };
}

// ===== SSE Event names =====

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
