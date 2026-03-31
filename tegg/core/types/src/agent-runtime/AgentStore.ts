import type { InputMessage, MessageObject } from './AgentMessage.ts';

export type { InputMessage, MessageObject } from './AgentMessage.ts';

// ===== Object types =====

export const AgentObjectType = {
  Thread: 'thread',
  ThreadRun: 'thread.run',
  ThreadMessage: 'thread.message',
  ThreadMessageDelta: 'thread.message.delta',
} as const;
export type AgentObjectType = (typeof AgentObjectType)[keyof typeof AgentObjectType];

// ===== Run statuses =====

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

// ===== Run configuration =====

export interface AgentRunConfig {
  maxIterations?: number;
  timeoutMs?: number;
}

// ===== Store records =====

export interface ThreadRecord {
  id: string;
  object: typeof AgentObjectType.Thread;
  /**
   * Logically belongs to the thread. In OSSAgentStore the messages are stored
   * separately as a JSONL file and assembled on read — callers should treat
   * this as a unified view regardless of the underlying storage layout.
   */
  messages: MessageObject[];
  metadata: Record<string, unknown>;
  createdAt: number; // Unix seconds
}

export interface RunRecord {
  id: string;
  object: typeof AgentObjectType.ThreadRun;
  threadId?: string;
  status: RunStatus;
  input: InputMessage[];
  output?: MessageObject[];
  lastError?: { code: string; message: string } | null;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  config?: AgentRunConfig;
  metadata?: Record<string, unknown>;
  createdAt: number;
  startedAt?: number | null;
  completedAt?: number | null;
  cancelledAt?: number | null;
  failedAt?: number | null;
}

// ===== Store interface =====

export interface AgentStore {
  init?(): Promise<void>;
  destroy?(): Promise<void>;
  createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord>;
  getThread(threadId: string): Promise<ThreadRecord>;
  appendMessages(threadId: string, messages: MessageObject[]): Promise<void>;
  createRun(
    input: InputMessage[],
    threadId?: string,
    config?: AgentRunConfig,
    metadata?: Record<string, unknown>,
  ): Promise<RunRecord>;
  getRun(runId: string): Promise<RunRecord>;
  updateRun(runId: string, updates: Partial<RunRecord>): Promise<void>;
}
