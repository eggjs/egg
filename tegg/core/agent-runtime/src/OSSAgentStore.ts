import crypto from 'node:crypto';

import type {
  AgentRunConfig,
  AgentStore,
  InputMessage,
  MessageObject,
  RunRecord,
  ThreadRecord,
} from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, RunStatus } from '@eggjs/tegg-types/agent-runtime';
import { AgentNotFoundError } from '@eggjs/tegg-types/agent-runtime';
import type { ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';

import { nowUnix } from './AgentStoreUtils.ts';

export interface OSSAgentStoreOptions {
  client: ObjectStorageClient;
  prefix?: string;
}

/**
 * Thread metadata stored as a JSON object (excludes messages).
 * Messages are stored separately in a JSONL file for append-friendly writes.
 */
type ThreadMetadata = Omit<ThreadRecord, 'messages'>;

/**
 * AgentStore implementation backed by an ObjectStorageClient (OSS, S3, etc.).
 *
 * ## Storage layout
 *
 * ```
 * {prefix}threads/{id}/meta.json      — Thread metadata (JSON)
 * {prefix}threads/{id}/messages.jsonl  — Messages (JSONL, one JSON object per line)
 * {prefix}runs/{id}.json              — Run record (JSON)
 * ```
 *
 * ### Why split threads into two keys?
 *
 * Thread messages are append-only: new messages are added at the end but never
 * modified or deleted. Storing them as a JSONL file allows us to leverage the
 * OSS AppendObject API (or similar) to write new messages without reading the
 * entire thread first. This is much more efficient than read-modify-write for
 * long conversations.
 *
 * If the underlying ObjectStorageClient provides an `append()` method, it will
 * be used for O(1) message writes. Otherwise, the store falls back to
 * get-concat-put (which is NOT atomic and may lose data under concurrent
 * writers — acceptable for single-writer scenarios).
 *
 * ### Atomicity note
 *
 * Run updates still use read-modify-write because run fields are mutated
 * (status, timestamps, output, etc.) — they cannot be modelled as append-only.
 * For multi-writer safety, consider a database-backed AgentStore or ETag-based
 * conditional writes with retry.
 */
export class OSSAgentStore implements AgentStore {
  private readonly client: ObjectStorageClient;
  private readonly prefix: string;

  constructor(options: OSSAgentStoreOptions) {
    this.client = options.client;
    // Normalize: ensure non-empty prefix ends with '/'
    const raw = options.prefix ?? '';
    this.prefix = raw && !raw.endsWith('/') ? raw + '/' : raw;
  }

  // ── Key helpers ──────────────────────────────────────────────────────

  /** Key for thread metadata (JSON). */
  private threadMetaKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}/meta.json`;
  }

  /** Key for thread messages (JSONL, one message per line). */
  private threadMessagesKey(threadId: string): string {
    return `${this.prefix}threads/${threadId}/messages.jsonl`;
  }

  /** Key for run record (JSON). */
  private runKey(runId: string): string {
    return `${this.prefix}runs/${runId}.json`;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  async init(): Promise<void> {
    await this.client.init?.();
  }

  async destroy(): Promise<void> {
    await this.client.destroy?.();
  }

  // ── Thread operations ────────────────────────────────────────────────

  async createThread(metadata?: Record<string, unknown>): Promise<ThreadRecord> {
    const threadId = `thread_${crypto.randomUUID()}`;
    const meta: ThreadMetadata = {
      id: threadId,
      object: AgentObjectType.Thread,
      metadata: metadata ?? {},
      created_at: nowUnix(),
    };
    await this.client.put(this.threadMetaKey(threadId), JSON.stringify(meta));
    // Messages file is created lazily on first appendMessages call.
    return { ...meta, messages: [] };
  }

  async getThread(threadId: string): Promise<ThreadRecord> {
    const metaData = await this.client.get(this.threadMetaKey(threadId));
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    const meta = JSON.parse(metaData) as ThreadMetadata;

    // Read messages JSONL — may not exist yet if no messages were appended.
    const messagesData = await this.client.get(this.threadMessagesKey(threadId));
    const messages: MessageObject[] = messagesData
      ? messagesData
          .trim()
          .split('\n')
          .filter((line) => line.length > 0)
          .map((line) => JSON.parse(line) as MessageObject)
      : [];

    return { ...meta, messages };
  }

  /**
   * Append messages to a thread.
   *
   * Each message is serialized as a single JSON line (JSONL format).
   * When the underlying client supports `append()`, this is a single
   * O(1) write — no need to read the existing messages first.
   */
  async appendMessages(threadId: string, messages: MessageObject[]): Promise<void> {
    if (messages.length === 0) return;

    // Verify the thread exists before writing messages.
    const metaData = await this.client.get(this.threadMetaKey(threadId));
    if (!metaData) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }

    const lines = messages.map((m) => JSON.stringify(m)).join('\n') + '\n';
    const messagesKey = this.threadMessagesKey(threadId);

    if (this.client.append) {
      // Fast path: use the native append API (e.g., OSS AppendObject).
      await this.client.append(messagesKey, lines);
    } else {
      // Slow path: read-modify-write fallback.
      // NOTE: Not atomic — concurrent appends may lose data.
      const existing = (await this.client.get(messagesKey)) ?? '';
      await this.client.put(messagesKey, existing + lines);
    }
  }

  // ── Run operations ───────────────────────────────────────────────────

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

  // TODO: read-modify-write is NOT atomic. Concurrent updates may lose data.
  // Acceptable for single-writer scenarios; for multi-writer, consider ETag-based
  // conditional writes with retry, or use a database-backed AgentStore instead.
  async updateRun(runId: string, updates: Partial<RunRecord>): Promise<void> {
    const run = await this.getRun(runId);
    const { id: _, object: __, ...safeUpdates } = updates;
    Object.assign(run, safeUpdates);
    await this.client.put(this.runKey(runId), JSON.stringify(run));
  }
}
