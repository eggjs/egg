import type { MessageObject, RunObject, RunRecord, AgentRunConfig } from '@eggjs/tegg-types/agent-runtime';
import { RunStatus, AgentErrorCode, AgentObjectType } from '@eggjs/tegg-types/agent-runtime';
import { InvalidRunStateTransitionError } from '@eggjs/tegg-types/agent-runtime';

import { nowUnix } from './AgentStoreUtils.ts';

/** Accumulated token usage — same shape as non-null RunRecord['usage']. */
export type RunUsage = NonNullable<RunRecord['usage']>;

/**
 * Encapsulates run state transitions.
 *
 * Mutation methods (`start`, `complete`, `fail`, `cancel`) update internal
 * state and return `Partial<RunRecord>` for the store.
 *
 * `snapshot()` produces a `RunObject` suitable for API responses and SSE events.
 */
export class RunBuilder {
  private readonly id: string;
  private readonly threadId: string;
  private readonly createdAt: number;
  private readonly metadata?: Record<string, unknown>;
  private readonly config?: AgentRunConfig;

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
    config?: AgentRunConfig,
  ) {
    this.id = id;
    this.threadId = threadId;
    this.createdAt = createdAt;
    this.status = status;
    this.metadata = metadata;
    this.config = config;
  }

  /** Create a RunBuilder from a store RunRecord, using its own threadId. */
  static fromRecord(run: RunRecord): RunBuilder {
    return RunBuilder.create(run, run.threadId ?? '');
  }

  /** Create a RunBuilder from a store RunRecord, restoring all mutable state. */
  static create(run: RunRecord, threadId: string): RunBuilder {
    const rb = new RunBuilder(run.id, threadId, run.createdAt, run.status, run.metadata, run.config);
    rb.startedAt = run.startedAt ?? undefined;
    rb.completedAt = run.completedAt ?? undefined;
    rb.cancelledAt = run.cancelledAt ?? undefined;
    rb.failedAt = run.failedAt ?? undefined;
    rb.lastError = run.lastError ?? undefined;
    rb.output = run.output;
    if (run.usage) {
      rb.usage = { ...run.usage };
    }
    return rb;
  }

  /** queued -> in_progress. Returns store update. */
  start(): Partial<RunRecord> {
    if (this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.InProgress);
    }
    this.status = RunStatus.InProgress;
    this.startedAt = nowUnix();
    return { status: this.status, startedAt: this.startedAt };
  }

  /** in_progress -> completed. Returns store update. */
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
      usage,
      completedAt: this.completedAt,
    };
  }

  /** queued/in_progress -> failed. Returns store update. */
  fail(error: Error): Partial<RunRecord> {
    if (this.status !== RunStatus.InProgress && this.status !== RunStatus.Queued) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Failed);
    }
    this.status = RunStatus.Failed;
    this.failedAt = nowUnix();
    this.lastError = { code: AgentErrorCode.ExecError, message: error.message };
    return {
      status: this.status,
      lastError: this.lastError,
      failedAt: this.failedAt,
    };
  }

  /** in_progress/queued -> cancelling (idempotent if already cancelling). Returns store update. */
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

  /** cancelling -> cancelled. Returns store update. */
  cancel(): Partial<RunRecord> {
    if (this.status !== RunStatus.Cancelling) {
      throw new InvalidRunStateTransitionError(this.status, RunStatus.Cancelled);
    }
    this.status = RunStatus.Cancelled;
    this.cancelledAt = nowUnix();
    return {
      status: this.status,
      cancelledAt: this.cancelledAt,
    };
  }

  /** Produce a RunObject snapshot for API / SSE. */
  snapshot(): RunObject {
    return {
      id: this.id,
      object: AgentObjectType.ThreadRun,
      createdAt: this.createdAt,
      threadId: this.threadId,
      status: this.status,
      lastError: this.lastError,
      startedAt: this.startedAt ?? null,
      completedAt: this.completedAt ?? null,
      cancelledAt: this.cancelledAt ?? null,
      failedAt: this.failedAt ?? null,
      usage: this.usage ?? null,
      metadata: this.metadata,
      output: this.output,
      config: this.config,
    };
  }
}
