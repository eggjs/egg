import type { MessageObject, RunObject } from '@eggjs/controller-decorator';
import { RunStatus, AgentErrorCode, AgentObjectType } from '@eggjs/controller-decorator';

import type { RunRecord } from './AgentStore.ts';
import { nowUnix } from './utils.ts';

/**
 * Accumulated token usage in camelCase for internal use.
 * Converted to snake_case at output boundaries (store / API / SSE).
 */
export interface RunUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Encapsulates run state transitions using camelCase internally.
 *
 * Mutation methods (`start`, `complete`, `fail`, `cancel`) update internal
 * state and return `Partial<RunRecord>` (snake_case) for the store.
 *
 * `snapshot()` converts the full internal state to a snake_case `RunObject`
 * suitable for API responses and SSE events.
 */
export class RunBuilder {
  private readonly id: string;
  private readonly threadId: string;
  private readonly createdAt: number;
  private readonly metadata?: Record<string, unknown>;

  private status: RunStatus = RunStatus.Queued;
  private startedAt?: number;
  private completedAt?: number;
  private cancelledAt?: number;
  private failedAt?: number;
  private lastError?: { code: string; message: string } | null;
  private usage?: RunUsage;
  private output?: MessageObject[];

  private constructor(id: string, threadId: string, createdAt: number, metadata?: Record<string, unknown>) {
    this.id = id;
    this.threadId = threadId;
    this.createdAt = createdAt;
    this.metadata = metadata;
  }

  /** Create a RunBuilder from a store RunRecord. */
  static create(run: RunRecord, threadId: string): RunBuilder {
    return new RunBuilder(run.id, threadId, run.created_at, run.metadata);
  }

  /** queued → in_progress. Returns store update (snake_case). */
  start(): Partial<RunRecord> {
    this.status = RunStatus.InProgress;
    this.startedAt = nowUnix();
    return { status: this.status, started_at: this.startedAt };
  }

  /** in_progress → completed. Returns store update (snake_case). */
  complete(output: MessageObject[], usage?: RunUsage): Partial<RunRecord> {
    this.status = RunStatus.Completed;
    this.completedAt = nowUnix();
    this.output = output;
    this.usage = usage;
    return {
      status: this.status,
      output,
      usage: usage
        ? {
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            total_tokens: usage.totalTokens,
          }
        : undefined,
      completed_at: this.completedAt,
    };
  }

  /** in_progress → failed. Returns store update (snake_case). */
  fail(error: Error): Partial<RunRecord> {
    this.status = RunStatus.Failed;
    this.failedAt = nowUnix();
    this.lastError = { code: AgentErrorCode.ExecError, message: error.message };
    return {
      status: this.status,
      last_error: this.lastError,
      failed_at: this.failedAt,
    };
  }

  /** in_progress/queued → cancelled. Returns store update (snake_case). */
  cancel(): Partial<RunRecord> {
    this.status = RunStatus.Cancelled;
    this.cancelledAt = nowUnix();
    return {
      status: this.status,
      cancelled_at: this.cancelledAt,
    };
  }

  /** Convert internal camelCase state to snake_case RunObject for API / SSE. */
  snapshot(): RunObject {
    return {
      id: this.id,
      object: AgentObjectType.ThreadRun,
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
    };
  }
}
