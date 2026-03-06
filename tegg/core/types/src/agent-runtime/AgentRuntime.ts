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

// ===== Content block types =====

export const ContentBlockType = {
  Text: 'text',
} as const;
export type ContentBlockType = (typeof ContentBlockType)[keyof typeof ContentBlockType];

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

// ===== Content types =====

export interface InputContentPart {
  type: typeof ContentBlockType.Text;
  text: string;
}

export interface TextContentBlock {
  type: typeof ContentBlockType.Text;
  text: { value: string; annotations: unknown[] };
}

export type MessageContentBlock = TextContentBlock;

// ===== Thread objects =====

export interface ThreadObject {
  id: string;
  object: 'thread';
  created_at: number;
  metadata: Record<string, unknown>;
}

export interface ThreadObjectWithMessages extends ThreadObject {
  messages: import('./AgentStore.ts').MessageObject[];
}

// ===== Run objects =====

export interface RunObject {
  id: string;
  object: 'thread.run';
  created_at: number;
  thread_id: string;
  status: import('./AgentStore.ts').RunStatus;
  last_error?: { code: string; message: string } | null;
  started_at?: number | null;
  completed_at?: number | null;
  cancelled_at?: number | null;
  failed_at?: number | null;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  metadata?: Record<string, unknown>;
  output?: import('./AgentStore.ts').MessageObject[];
  config?: import('./AgentStore.ts').AgentRunConfig;
}

// ===== Run input =====

export interface CreateRunInput {
  thread_id?: string;
  input: {
    messages: Array<{
      role: MessageRole;
      content: string | InputContentPart[];
    }>;
  };
  config?: import('./AgentStore.ts').AgentRunConfig;
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
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface AgentStreamMessage {
  type?: string;
  message?: AgentStreamMessagePayload;
  usage?: AgentRunUsage;
}
