import type { InputMessage, MessageObject, AgentRunConfig, RunObject, RunStatus } from '@eggjs/controller-decorator';
import { AgentObjectType } from '@eggjs/controller-decorator';

/**
 * Serialized JSON format for RunRecord (snake_case, matches wire format).
 */
export interface RunRecordJSON {
  id: string;
  object: AgentObjectType.ThreadRun;
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

/** Partial update type for store.updateRun(). */
export type RunRecordUpdate = Partial<Omit<RunRecordJSON, 'id' | 'object'>>;

/**
 * Internal representation of a run record using camelCase.
 *
 * Use `toJSON()` to serialize to snake_case for storage / API responses.
 * Use `RunRecord.fromJSON()` to deserialize from snake_case.
 * `JSON.stringify()` automatically calls `toJSON()`.
 * Use `toRunObject()` to produce an API-compatible `RunObject`.
 */
export class RunRecord {
  readonly id: string;
  readonly object: AgentObjectType.ThreadRun = AgentObjectType.ThreadRun;
  readonly threadId?: string;
  status: RunStatus;
  input: InputMessage[];
  output?: MessageObject[];
  lastError?: { code: string; message: string } | null;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  config?: AgentRunConfig;
  metadata?: Record<string, unknown>;
  readonly createdAt: number;
  startedAt?: number | null;
  completedAt?: number | null;
  cancelledAt?: number | null;
  failedAt?: number | null;

  constructor(params: {
    id: string;
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
  }) {
    this.id = params.id;
    this.threadId = params.threadId;
    this.status = params.status;
    this.input = params.input;
    this.output = params.output;
    this.lastError = params.lastError;
    this.usage = params.usage;
    this.config = params.config;
    this.metadata = params.metadata;
    this.createdAt = params.createdAt;
    this.startedAt = params.startedAt;
    this.completedAt = params.completedAt;
    this.cancelledAt = params.cancelledAt;
    this.failedAt = params.failedAt;
  }

  toJSON(): RunRecordJSON {
    return {
      id: this.id,
      object: this.object,
      thread_id: this.threadId,
      status: this.status,
      input: this.input,
      output: this.output,
      last_error: this.lastError,
      usage: this.usage
        ? {
            prompt_tokens: this.usage.promptTokens,
            completion_tokens: this.usage.completionTokens,
            total_tokens: this.usage.totalTokens,
          }
        : this.usage,
      config: this.config,
      metadata: this.metadata,
      created_at: this.createdAt,
      started_at: this.startedAt,
      completed_at: this.completedAt,
      cancelled_at: this.cancelledAt,
      failed_at: this.failedAt,
    };
  }

  static fromJSON(json: RunRecordJSON): RunRecord {
    return new RunRecord({
      id: json.id,
      threadId: json.thread_id,
      status: json.status,
      input: json.input,
      output: json.output,
      lastError: json.last_error,
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : json.usage,
      config: json.config,
      metadata: json.metadata,
      createdAt: json.created_at,
      startedAt: json.started_at,
      completedAt: json.completed_at,
      cancelledAt: json.cancelled_at,
      failedAt: json.failed_at,
    });
  }

  /** Produce an API-compatible RunObject (snake_case). */
  toRunObject(): RunObject {
    return {
      id: this.id,
      object: this.object,
      created_at: this.createdAt,
      thread_id: this.threadId,
      status: this.status,
      last_error: this.lastError,
      started_at: this.startedAt ?? null,
      completed_at: this.completedAt ?? null,
      cancelled_at: this.cancelledAt ?? null,
      failed_at: this.failedAt ?? null,
      usage: this.usage
        ? {
            prompt_tokens: this.usage.promptTokens,
            completion_tokens: this.usage.completionTokens,
            total_tokens: this.usage.totalTokens,
          }
        : null,
      metadata: this.metadata,
      output: this.output,
      config: this.config,
    };
  }
}
