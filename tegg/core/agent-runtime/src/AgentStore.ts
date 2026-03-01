import type {
  InputMessage,
  MessageObject,
  AgentRunConfig,
  RunStatus,
  AgentObjectType,
} from '@eggjs/controller-decorator';

export interface ThreadRecord {
  id: string;
  object: typeof AgentObjectType.Thread;
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
