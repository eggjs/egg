import type { AgentMessage, InputMessage } from './AgentMessage.ts';
import type { GetThreadOptions } from './AgentRuntime.ts';

// ===== Object types =====

export const AgentObjectType = {
  Thread: 'thread',
  ThreadRun: 'thread.run',
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
   * All messages in the thread, stored as SDK-format AgentMessage objects.
   * In OSSAgentStore the messages are stored separately as a JSONL file
   * and assembled on read — callers should treat this as a unified view
   * regardless of the underlying storage layout.
   */
  messages: AgentMessage[];
  metadata: Record<string, unknown>;
  createdAt: number; // Unix seconds
  /**
   * Id of the most recently created run on this thread, maintained by
   * `createRun` as a best-effort pointer so callers can resolve a thread's
   * latest run without an external index. Absent on threads that have no
   * runs yet, and on threads created before this field existed — a missing
   * value must be treated as "no recent run".
   */
  latestRunId?: string;
}

export interface RunRecord {
  id: string;
  object: typeof AgentObjectType.ThreadRun;
  threadId?: string;
  status: RunStatus;
  input: InputMessage[];
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
  getThread(threadId: string, options?: GetThreadOptions): Promise<ThreadRecord>;
  /**
   * Shallow-merge metadata into an existing thread.
   * New values overwrite matching keys; omitted keys are preserved.
   */
  updateThreadMetadata?(threadId: string, metadata: Record<string, unknown>): Promise<void>;
  appendMessages(threadId: string, messages: AgentMessage[]): Promise<void>;
  createRun(
    input: InputMessage[],
    threadId?: string,
    config?: AgentRunConfig,
    metadata?: Record<string, unknown>,
  ): Promise<RunRecord>;
  getRun(runId: string): Promise<RunRecord>;
  /**
   * Id of the most recent run created on the thread, or `null` when the
   * thread exists but has no recorded run (including threads created before
   * run tracking existed). Throws AgentNotFoundError when the thread itself
   * does not exist.
   */
  getLatestRunId(threadId: string): Promise<string | null>;
  updateRun(runId: string, updates: Partial<RunRecord>): Promise<void>;
}
