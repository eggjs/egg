/**
 * Abstract interface for object storage operations (e.g., OSS, S3, local fs).
 * Implementations must handle serialization/deserialization of values.
 */
export interface ObjectStorageClient {
  init?(): Promise<void>;
  destroy?(): Promise<void>;
  put(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
}
