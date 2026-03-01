import crypto from 'node:crypto';

import type { AgentRunConfig, AgentStore, InputMessage, MessageObject, RunRecord, ThreadRecord } from './AgentStore.ts';
import { AgentObjectType, RunStatus } from './AgentStore.ts';
import { AgentNotFoundError } from './errors.ts';
import type { ObjectStorageClient } from './ObjectStorageClient.ts';
import { nowUnix } from './utils.ts';

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
}

export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? '';
  }

  private threadKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}.json`;
  }

  private runKey(runId: string): string {
    return `${this.prefix}runs/${runId}.json`;
  }

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    await this.client.destroy?.();
  }

  async createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord> {
    const threadId = `thread_${crypto.randomUUID()}`;
    const record: ThreadRecord = {
      id: threadId,
      object: AgentObjectType.Thread,
      messages: [],
      metadata: metadata ?? {},
      created_at: nowUnix(),
    };
    await this.client.put(this.threadKey(threadId), JSON.stringify(record));
    return record;
  }

  async getThread(threadId: string): Promise<ThreadRecord> {
    const data = await this.client.get(this.threadKey(threadId));
    if (!data) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    return JSON.parse(data) as ThreadRecord;
  }

  async appendMessages(threadId: string, messages: MessageObject[]): Promise<void> {
    const thread = await this.getThread(threadId);
    thread.messages.push(...messages);
    await this.client.put(this.threadKey(threadId), JSON.stringify(thread));
  }

  async createRun(
    input: InputMessage[],
    threadId?: string,
    config?: AgentRunConfig,
    metadata?: Record<string, unknown>,
  ): Promise<RunRecord> {
    const runId = `run_${crypto.randomUUID()}`;
    const record: RunRecord = {
      id: runId,
      object: AgentObjectType.ThreadRun,
      thread_id: threadId,
      status: RunStatus.Queued,
      input,
      config,
      metadata,
      created_at: nowUnix(),
    };
    await this.client.put(this.runKey(runId), JSON.stringify(record));
    return record;
  }

  async getRun(runId: string): Promise<RunRecord> {
    const data = await this.client.get(this.runKey(runId));
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return JSON.parse(data) as RunRecord;
  }

  async updateRun(runId: string, updates: Partial<RunRecord>): Promise<void> {
    const run = await this.getRun(runId);
    const { id: _, object: __, ...safeUpdates } = updates;
    Object.assign(run, safeUpdates);
    await this.client.put(this.runKey(runId), JSON.stringify(run));
  }
}
