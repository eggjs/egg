import type { ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';
import type { OSSObject } from 'oss-client';

function isOSSError(err: unknown, code: string): boolean {
  return err != null && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === code;
}

/**
 * ObjectStorageClient backed by Alibaba Cloud OSS (via oss-client).
 *
 * Supports both `put`/`get` for normal objects and `append` for
 * OSS Appendable Objects. The append path uses a local position cache
 * to avoid extra HEAD requests; on position mismatch it falls back to
 * HEAD + retry automatically.
 *
 * The OSSObject instance should be constructed and injected by the caller,
 * following the IoC/DI principle.
 */
export class OSSObjectStorageClient implements ObjectStorageClient {
  private readonly client: OSSObject;

  /**
   * In-memory cache of next-append positions.
   *
   * After each successful `append()`, OSS returns `nextAppendPosition`.
   * We cache it here so the next append can skip a HEAD round-trip.
   * If the cached position is stale (e.g., process restarted or another
   * writer appended), the append will fail with PositionNotEqualToLength
   * and we fall back to HEAD + retry.
   */
  private readonly appendPositions = new Map<string, number>();

  constructor(client: OSSObject) {
    this.client = client;
  }

  async put(key: string, value: string): Promise<void> {
    await this.client.put(key, Buffer.from(value, 'utf-8'));
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.get(key);
      if (result.content) {
        return Buffer.isBuffer(result.content) ? result.content.toString('utf-8') : String(result.content);
      }
      return null;
    } catch (err: unknown) {
      if (isOSSError(err, 'NoSuchKey')) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Append data to an OSS Appendable Object.
   *
   * OSS AppendObject requires a `position` parameter that must equal the
   * current object size. We use a three-step strategy:
   *
   * 1. Use the cached position (0 for new objects, or the value from the
   *    last successful append).
   * 2. If OSS returns PositionNotEqualToLength (cache is stale), issue a
   *    HEAD request to learn the current object size, then retry once.
   * 3. Update the cache with `nextAppendPosition` from the response.
   *
   * This gives us single-round-trip performance in the common case (single
   * writer, no restarts) while still being self-healing when the cache is
   * stale.
   */
  async append(key: string, value: string): Promise<void> {
    const buf = Buffer.from(value, 'utf-8');
    const position = this.appendPositions.get(key) ?? 0;

    try {
      const result = await this.client.append(key, buf, { position });
      this.appendPositions.set(key, Number(result.nextAppendPosition));
    } catch (err: unknown) {
      // Position mismatch — the object grew since our last cached position.
      // Fall back to HEAD to learn the actual size, then retry.
      if (isOSSError(err, 'PositionNotEqualToLength')) {
        const head = await this.client.head(key);
        const currentPos = Number(head.res.headers['content-length'] ?? 0);
        const result = await this.client.append(key, buf, { position: currentPos });
        this.appendPositions.set(key, Number(result.nextAppendPosition));
      } else {
        throw err;
      }
    }
  }
}
