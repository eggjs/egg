import type { MessageObject, RunObject, RunRecord } from '@eggjs/tegg-types/agent-runtime';
import { RunStatus, AgentErrorCode, AgentObjectType } from '@eggjs/tegg-types/agent-runtime';
import { InvalidRunStateTransitionError } from '@eggjs/tegg-types/agent-runtime';

import { nowUnix } from './AgentStoreUtils.ts';

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

  private status: RunStatus;
  private startedAt?: number;
  private completedAt?: number;
  private cancelledAt?: number;
  private failedAt?: number;
  private lastError?: { code: string; message: string } | null;
  private usage?: RunUsage;
  private output?: MessageObject[];

  private constructor(
    id: string,
    threadId: string,
    createdAt: number,
    status: RunStatus,
    metadata?: Record<string, unknown>,
  ) {
    this.id = id;
    this.threadId = threadId;
    this.createdAt = createdAt;
    this.status = status;
    this.metadata = metadata;
  }

  /** Create a RunBuilder from a store RunRecord, restoring all mutable state. */
  static create(run: RunRecord, threadId: string): RunBuilder {
    const rb = new RunBuilder(run.id, threadId, run.created_at, run.status, run.metadata);
    rb.startedAt = run.started_at ?? undefined;
    rb.completedAt = run.completed_at ?? undefined;
    rb.cancelledAt = run.cancelled_at ?? undefined;
    rb.failedAt = run.failed_at ?? undefined;
    rb.lastError = run.last_error ?? undefined;
    rb.output = run.output;
    if (run.usage) {
      rb.usage = {
        promptTokens: run.usage.prompt_tokens,
        completionTokens: run.usage.completion_tokens,
        totalTokens: run.usage.total_tokens,
      };
    }
    return rb;
  }

  /** queued → in_progress. Returns store update (snake_case). */
  start(): Partial<RunRecord> {
    if (this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.InProgress);
    }
    this.status = RunStatus.InProgress;
    this.startedAt = nowUnix();
    return { status: this.status, started_at: this.startedAt };
  }

  /** in_progress → completed. Returns store update (snake_case). */
  complete(output: MessageObject[], usage?: RunUsage): Partial<RunRecord> {
    if (this.status !== RunStatus.InProgress) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Completed);
    }
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

  /** queued/in_progress → failed. Returns store update (snake_case). */
  fail(error: Error): Partial<RunRecord> {
    if (this.status !== RunStatus.InProgress && this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Failed);
    }
    this.status = RunStatus.Failed;
    this.failedAt = nowUnix();
    this.lastError = { code: AgentErrorCode.ExecError, message: error.message };
    return {
      status: this.status,
      last_error: this.lastError,
      failed_at: this.failedAt,
    };
  }

  /** in_progress/queued → cancelling (idempotent if already cancelling). Returns store update (snake_case). */
  cancelling(): Partial<RunRecord> {
    if (this.status === RunStatus.Cancelling) {
      return { status: this.status };
    }
    if (this.status !== RunStatus.InProgress && this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Cancelling);
    }
    this.status = RunStatus.Cancelling;
    return { status: this.status };
  }

  /** cancelling → cancelled. Returns store update (snake_case). */
  cancel(): Partial<RunRecord> {
    if (this.status !== RunStatus.Cancelling) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Cancelled);
    }
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
