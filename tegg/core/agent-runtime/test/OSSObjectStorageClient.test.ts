import { strict as assert } from 'node:assert';

import type { OSSObject } from 'oss-client';
import { describe, it, vi, beforeEach } from 'vitest';

import { OSSObjectStorageClient } from '../src/OSSObjectStorageClient.ts';

describe('core/agent-runtime/test/OSSObjectStorageClient.test.ts', () => {
  let client: OSSObjectStorageClient;
  let mockOSS: {
    put: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    append: ReturnType<typeof vi.fn>;
    head: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockOSS = {
      put: vi.fn(),
      get: vi.fn(),
      append: vi.fn(),
      head: vi.fn(),
    };
    client = new OSSObjectStorageClient(mockOSS as unknown as OSSObject);
  });

  describe('put', () => {
    it('should pass Buffer to SDK put', async () => {
      mockOSS.put.mockResolvedValue({});
      await client.put('threads/t1.json', '{"id":"t1"}');

      assert.equal(mockOSS.put.mock.calls.length, 1);
      const [key, body] = mockOSS.put.mock.calls[0];
      assert.equal(key, 'threads/t1.json');
      assert(Buffer.isBuffer(body));
      assert.equal(body.toString('utf-8'), '{"id":"t1"}');
    });
  });

  describe('get', () => {
    it('should return string when content is Buffer', async () => {
      mockOSS.get.mockResolvedValue({
        content: Buffer.from('{"id":"t1"}', 'utf-8'),
      });
      const result = await client.get('threads/t1.json');
      assert.equal(result, '{"id":"t1"}');
    });

    it('should return string when content is non-Buffer', async () => {
      mockOSS.get.mockResolvedValue({
        content: '{"id":"t1"}',
      });
      const result = await client.get('threads/t1.json');
      assert.equal(result, '{"id":"t1"}');
    });

    it('should return null when content is empty', async () => {
      mockOSS.get.mockResolvedValue({ content: null });
      const result = await client.get('threads/t1.json');
      assert.equal(result, null);
    });

    it('should return null for NoSuchKey error', async () => {
      const err = new Error('Object not exists');
      (err as Error & { code: string }).code = 'NoSuchKey';
      mockOSS.get.mockRejectedValue(err);

      const result = await client.get('threads/nonexistent.json');
      assert.equal(result, null);
    });

    it('should re-throw non-NoSuchKey errors', async () => {
      const err = new Error('Network failure');
      mockOSS.get.mockRejectedValue(err);

      await assert.rejects(
        () => client.get('threads/t1.json'),
        (thrown: unknown) => {
          assert(thrown instanceof Error);
          assert.equal(thrown.message, 'Network failure');
          return true;
        },
      );
    });
  });

  describe('append', () => {
    it('should create new object with position 0 on first append', async () => {
      mockOSS.append.mockResolvedValue({ nextAppendPosition: '13' });
      await client.append('msgs.jsonl', '{"id":"m1"}\n');

      assert.equal(mockOSS.append.mock.calls.length, 1);
      const [key, buf, opts] = mockOSS.append.mock.calls[0];
      assert.equal(key, 'msgs.jsonl');
      assert(Buffer.isBuffer(buf));
      assert.equal(buf.toString('utf-8'), '{"id":"m1"}\n');
      assert.equal(opts.position, 0);
    });

    it('should use cached nextAppendPosition on subsequent appends', async () => {
      mockOSS.append.mockResolvedValueOnce({ nextAppendPosition: '13' });
      await client.append('msgs.jsonl', '{"id":"m1"}\n');

      mockOSS.append.mockResolvedValueOnce({ nextAppendPosition: '26' });
      await client.append('msgs.jsonl', '{"id":"m2"}\n');

      assert.equal(mockOSS.append.mock.calls.length, 2);
      assert.equal(mockOSS.append.mock.calls[1][2].position, 13);
    });

    it('should fall back to HEAD + retry on PositionNotEqualToLength', async () => {
      const posErr = new Error('Position mismatch');
      (posErr as Error & { code: string }).code = 'PositionNotEqualToLength';
      mockOSS.append.mockRejectedValueOnce(posErr);
      mockOSS.head.mockResolvedValue({ res: { headers: { 'content-length': '50' } } });
      mockOSS.append.mockResolvedValueOnce({ nextAppendPosition: '63' });

      await client.append('msgs.jsonl', '{"id":"m1"}\n');

      // First attempt failed, then HEAD, then retry
      assert.equal(mockOSS.append.mock.calls.length, 2);
      assert.equal(mockOSS.head.mock.calls.length, 1);
      assert.equal(mockOSS.append.mock.calls[1][2].position, 50);
    });

    it('should re-throw non-position errors', async () => {
      const err = new Error('Network failure');
      mockOSS.append.mockRejectedValue(err);

      await assert.rejects(
        () => client.append('msgs.jsonl', '{"id":"m1"}\n'),
        (thrown: unknown) => {
          assert(thrown instanceof Error);
          assert.equal(thrown.message, 'Network failure');
          return true;
        },
      );
    });
  });
});
