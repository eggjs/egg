import type { MessageObject, RunObject } from '@eggjs/controller-decorator';
import { RunStatus, AgentErrorCode } from '@eggjs/controller-decorator';

import type { RunRecord } from './AgentStore.ts';
import { nowUnix } from './utils.ts';

/**
 * Encapsulates RunObject state transitions.
 * Each mutation method returns a snapshot of the current state.
 */
export class RunBuilder {
  private readonly runObj: RunObject;

  private constructor(id: string, threadId: string, createdAt: number, metadata?: Record<string, unknown>) {
    this.runObj = {
      id,
      object: 'thread.run',
      created_at: createdAt,
      thread_id: threadId,
      status: RunStatus.Queued,
      metadata,
    };
  }

  /** Create a RunBuilder from a store RunRecord. */
  static create(run: RunRecord, threadId: string): RunBuilder {
    return new RunBuilder(run.id, threadId, run.created_at, run.metadata);
  }

  /** queued → in_progress */
  start(): RunObject {
    this.runObj.status = RunStatus.InProgress;
    this.runObj.started_at = nowUnix();
    return this.snapshot();
  }

  /** in_progress → completed */
  complete(output: MessageObject[], usage?: RunObject['usage']): RunObject {
    this.runObj.status = RunStatus.Completed;
    this.runObj.completed_at = nowUnix();
    this.runObj.output = output;
    this.runObj.usage = usage;
    return this.snapshot();
  }

  /** in_progress → failed */
  fail(error: Error): RunObject {
    this.runObj.status = RunStatus.Failed;
    this.runObj.failed_at = nowUnix();
    this.runObj.last_error = { code: AgentErrorCode.ExecError, message: error.message };
    return this.snapshot();
  }

  /** in_progress/queued → cancelled */
  cancel(): RunObject {
    this.runObj.status = RunStatus.Cancelled;
    this.runObj.cancelled_at = nowUnix();
    return this.snapshot();
  }

  /** Return the current state snapshot. */
  snapshot(): RunObject {
    return { ...this.runObj };
  }
}
