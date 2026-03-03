import type { InputMessage, MessageObject, AgentRunConfig } from '@eggjs/controller-decorator';

// Re-export for backwards compatibility (OSSAgentStore imports from here)
export { AgentObjectType, RunStatus } from '@eggjs/controller-decorator';
export type { InputMessage, MessageObject, AgentRunConfig } from '@eggjs/controller-decorator';

// ===== Store records =====

// Re-export ThreadRecord class — replaces the old ThreadRecord interface
import { ThreadRecord } from './ThreadRecord.ts';
export { ThreadRecord } from './ThreadRecord.ts';
export type { ThreadRecordJSON } from './ThreadRecord.ts';

// Re-export RunRecord class — replaces the old RunRecordJSON interface
import { RunRecord } from './RunRecord.ts';
import type { RunRecordUpdate } from './RunRecord.ts';
export { RunRecord } from './RunRecord.ts';
export type { RunRecordJSON, RunRecordUpdate } from './RunRecord.ts';

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
  updateRun(runId: string, updates: RunRecordUpdate): Promise<void>;
}
