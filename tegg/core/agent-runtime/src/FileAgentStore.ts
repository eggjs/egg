import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { InputMessage, MessageObject, AgentRunConfig } from '@eggjs/controller-decorator';
import { RunStatus, AgentObjectType } from '@eggjs/controller-decorator';

import type { AgentStore, ThreadRecord, RunRecord } from './AgentStore.ts';
import { AgentNotFoundError } from './errors.ts';
import { nowUnix } from './utils.ts';

export interface FileAgentStoreOptions {
  dataDir: string;
}

export class FileAgentStore implements AgentStore {
  private readonly dataDir: string;
  private readonly threadsDir: string;
  private readonly runsDir: string;

  constructor(options: FileAgentStoreOptions) {
    this.dataDir = options.dataDir;
    this.threadsDir = path.join(this.dataDir, 'threads');
    this.runsDir = path.join(this.dataDir, 'runs');
  }

  private safePath(baseDir: string, id: string): string {
    if (!id) {
      throw new Error('Invalid id: id must not be empty');
    }
    const filePath = path.join(baseDir, `${id}.json`);
    if (!filePath.startsWith(baseDir + path.sep)) {
      throw new Error(`Invalid id: ${id}`);
    }
    return filePath;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.threadsDir, { recursive: true });
    await fs.mkdir(this.runsDir, { recursive: true });
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
    await this.writeFile(this.safePath(this.threadsDir, threadId), record);
    return record;
  }

  async getThread(threadId: string): Promise<ThreadRecord> {
    const filePath = this.safePath(this.threadsDir, threadId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    return data as ThreadRecord;
  }

  // Note: read-modify-write without locking. In cluster mode with multiple workers
  // sharing the same dataDir, concurrent operations on the same thread may lose data.
  async appendMessages(threadId: string, messages: MessageObject[]): Promise<void> {
    const thread = await this.getThread(threadId);
    thread.messages.push(...messages);
    await this.writeFile(this.safePath(this.threadsDir, threadId), thread);
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
    await this.writeFile(this.safePath(this.runsDir, runId), record);
    return record;
  }

  async getRun(runId: string): Promise<RunRecord> {
    const filePath = this.safePath(this.runsDir, runId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return data as RunRecord;
  }

  async updateRun(runId: string, updates: Partial<RunRecord>): Promise<void> {
    const run = await this.getRun(runId);
    const { id: _, object: __, ...safeUpdates } = updates;
    Object.assign(run, safeUpdates);
    await this.writeFile(this.safePath(this.runsDir, runId), run);
  }

  private async writeFile(filePath: string, data: unknown): Promise<void> {
    // Write to a temp file first, then atomically rename to avoid data corruption
    // if the process crashes mid-write.
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(data), 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  private async readFile(filePath: string): Promise<unknown | null> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
    return JSON.parse(content);
  }
}
