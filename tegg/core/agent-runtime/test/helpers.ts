import type { ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';

/** In-memory ObjectStorageClient backed by a Map — for testing only. */
export class MapStorageClient implements ObjectStorageClient {
  private readonly store = new Map<string, string>();
  init?(): Promise<void>;
  destroy?(): Promise<void>;

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async append(key: string, value: string): Promise<void> {
    const existing = this.store.get(key) ?? '';
    this.store.set(key, existing + value);
  }
}

/** MapStorageClient variant without append — tests the get-concat-put fallback path. */
export class MapStorageClientWithoutAppend implements ObjectStorageClient {
  private readonly store = new Map<string, string>();
  init?(): Promise<void>;
  destroy?(): Promise<void>;

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
}
