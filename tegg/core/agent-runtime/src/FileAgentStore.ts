import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { InputMessage, MessageObject, AgentRunConfig } from '@eggjs/controller-decorator';

import type { AgentStore, ThreadRecord, RunRecord } from './AgentStore.ts';

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
      object: 'thread',
      messages: [],
      metadata: metadata ?? {},
      created_at: Math.floor(Date.now() / 1000),
    };
    await this.writeFile(this.safePath(this.threadsDir, threadId), record);
    return record;
  }

  async getThread(threadId: string): Promise<ThreadRecord> {
    const filePath = this.safePath(this.threadsDir, threadId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new Error(`Thread ${threadId} not found`);
    }
    return data as ThreadRecord;
  }

  // Note: read-modify-write without locking. Concurrent appends to the same thread may lose messages.
  // This is acceptable for a default file-based store; production stores should implement proper locking.
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
      object: 'thread.run',
      thread_id: threadId,
      status: 'queued',
      input,
      config,
      metadata,
      created_at: Math.floor(Date.now() / 1000),
    };
    await this.writeFile(this.safePath(this.runsDir, runId), record);
    return record;
  }

  async getRun(runId: string): Promise<RunRecord> {
    const filePath = this.safePath(this.runsDir, runId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new Error(`Run ${runId} not found`);
    }
    return data as RunRecord;
  }

  async updateRun(runId: string, updates: Partial<RunRecord>): Promise<void> {
    const run = await this.getRun(runId);
    Object.assign(run, updates);
    await this.writeFile(this.safePath(this.runsDir, runId), run);
  }

  private async writeFile(filePath: string, data: unknown): Promise<void> {
    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data), 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  private async readFile(filePath: string): Promise<unknown | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }
}
