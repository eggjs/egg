import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { InputMessage, MessageObject, AgentRunConfig } from '@eggjs/controller-decorator';
import { RunStatus } from '@eggjs/controller-decorator';

import type { AgentStore } from './AgentStore.ts';
import { nowUnix } from './AgentStoreUtils.ts';
import { AgentNotFoundError } from './errors.ts';
import type { RunRecordJSON, RunRecordUpdate } from './RunRecord.ts';
import { RunRecord } from './RunRecord.ts';
import { ThreadRecord } from './ThreadRecord.ts';
import type { ThreadRecordJSON } from './ThreadRecord.ts';

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
    const thread = new ThreadRecord({
      id: `thread_${crypto.randomUUID()}`,
      metadata,
      createdAt: nowUnix(),
    });
    // toJSON() is called by JSON.stringify — writes snake_case to disk
    await this.writeFile(this.safePath(this.threadsDir, thread.id), thread);
    return thread;
  }

  async getThread(threadId: string): Promise<ThreadRecord> {
    const filePath = this.safePath(this.threadsDir, threadId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    return ThreadRecord.fromJSON(data as ThreadRecordJSON);
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
    const record = new RunRecord({
      id: `run_${crypto.randomUUID()}`,
      threadId,
      status: RunStatus.Queued,
      input,
      config,
      metadata,
      createdAt: nowUnix(),
    });
    // toJSON() is called by JSON.stringify — writes snake_case to disk
    await this.writeFile(this.safePath(this.runsDir, record.id), record);
    return record;
  }

  async getRun(runId: string): Promise<RunRecord> {
    const filePath = this.safePath(this.runsDir, runId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return RunRecord.fromJSON(data as RunRecordJSON);
  }

  async updateRun(runId: string, updates: RunRecordUpdate): Promise<void> {
    // Read raw JSON from disk — keep in snake_case to match RunRecordUpdate format
    const filePath = this.safePath(this.runsDir, runId);
    const data = await this.readFile(filePath);
    if (!data) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    const raw = data as RunRecordJSON;
    const { id: _, object: __, ...safeUpdates } = updates as Record<string, unknown>;
    Object.assign(raw, safeUpdates);
    await this.writeFile(filePath, raw);
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
