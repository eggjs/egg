import { OSSObject } from 'oss-client';

import type { ObjectStorageClient } from './ObjectStorageClient.ts';

export interface OSSObjectStorageClientOptions {
  endpoint: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region?: string;
}

export class OSSObjectStorageClient implements ObjectStorageClient {
  private readonly client: OSSObject;

  constructor(options: OSSObjectStorageClientOptions) {
    this.client = new OSSObject({
      endpoint: options.endpoint,
      accessKeyId: options.accessKeyId,
      accessKeySecret: options.accessKeySecret,
      bucket: options.bucket,
      region: options.region,
    });
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
      if ((err as { code?: string }).code === 'NoSuchKey') {
        return null;
      }
      throw err;
    }
  }
}
