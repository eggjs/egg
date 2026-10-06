import type { ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';

interface PutDelayRule {
  pattern: RegExp;
  ms: number;
}

function shouldFailPut(key: string, exact: ReadonlySet<string>, pattern: RegExp | null): boolean {
  return exact.has(key) || (pattern !== null && pattern.test(key));
}

function findPutDelay(key: string, rules: readonly PutDelayRule[]): PutDelayRule | undefined {
  return rules.find((r) => r.pattern.test(key));
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** In-memory ObjectStorageClient backed by a Map — for testing only. */
export class MapStorageClient implements ObjectStorageClient {
  private readonly store = new Map<string, string>();
  private readonly putFailureExact = new Set<string>();
  private putFailurePattern: RegExp | null = null;
  private readonly putDelays: PutDelayRule[] = [];

  init?(): Promise<void>;
  destroy?(): Promise<void>;

  keys(): string[] {
    return [...this.store.keys()].sort();
  }

  keysWithPrefix(prefix: string): string[] {
    return this.keys().filter((k) => k.startsWith(prefix));
  }

  failPutWhenKeyMatches(pattern: RegExp): void {
    this.putFailurePattern = pattern;
  }

  delayPutWhenKeyMatches(pattern: RegExp, ms: number): void {
    this.putDelays.push({ pattern, ms });
  }

  async put(key: string, value: string): Promise<void> {
    if (shouldFailPut(key, this.putFailureExact, this.putFailurePattern)) {
      throw new Error(`MapStorageClient: simulated PUT failure for ${key}`);
    }
    const delay = findPutDelay(key, this.putDelays);
    if (delay) {
      await sleep(delay.ms);
    }
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

/** MapStorageClient variant without `append`. */
export class MapStorageClientWithoutAppend implements ObjectStorageClient {
  private readonly store = new Map<string, string>();
  private readonly putFailureExact = new Set<string>();
  private putFailurePattern: RegExp | null = null;
  private readonly putDelays: PutDelayRule[] = [];

  init?(): Promise<void>;
  destroy?(): Promise<void>;

  keys(): string[] {
    return [...this.store.keys()].sort();
  }

  keysWithPrefix(prefix: string): string[] {
    return this.keys().filter((k) => k.startsWith(prefix));
  }

  failPutWhenKeyMatches(pattern: RegExp): void {
    this.putFailurePattern = pattern;
  }

  delayPutWhenKeyMatches(pattern: RegExp, ms: number): void {
    this.putDelays.push({ pattern, ms });
  }

  async put(key: string, value: string): Promise<void> {
    if (shouldFailPut(key, this.putFailureExact, this.putFailurePattern)) {
      throw new Error(`MapStorageClientWithoutAppend: simulated PUT failure for ${key}`);
    }
    const delay = findPutDelay(key, this.putDelays);
    if (delay) {
      await sleep(delay.ms);
    }
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
}
