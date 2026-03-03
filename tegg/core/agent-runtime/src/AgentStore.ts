import {
  type InputMessage,
  type MessageObject,
  type AgentRunConfig,
  type RunStatus,
  AgentObjectType,
} from '@eggjs/controller-decorator';

// Re-export for backwards compatibility (OSSAgentStore imports from here)
export { AgentObjectType, RunStatus } from '@eggjs/controller-decorator';
export type { InputMessage, MessageObject, AgentRunConfig } from '@eggjs/controller-decorator';

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
  created_at: number; // Unix seconds
}

export interface RunRecord {
  id: string;
  object: typeof AgentObjectType.ThreadRun;
  thread_id?: string;
  status: RunStatus;
  input: InputMessage[];
  output?: MessageObject[];
  last_error?: { code: string; message: string } | null;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  config?: AgentRunConfig;
  metadata?: Record<string, unknown>;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
  cancelled_at?: number | null;
  failed_at?: number | null;
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
