import { strict as assert } from 'node:assert';

import { describe, it, vi, beforeEach } from 'vitest';

import { OSSObjectStorageClient } from '../src/OSSObjectStorageClient.ts';

// Mock oss-client module — intercept OSSObject constructor and its methods
const mockPut = vi.fn();
const mockGet = vi.fn();
const mockAppend = vi.fn();
const mockHead = vi.fn();

vi.mock('oss-client', () => {
  class MockOSSObject {
    put = mockPut;
    get = mockGet;
    append = mockAppend;
    head = mockHead;
  }
  return { OSSObject: MockOSSObject };
});

describe('core/agent-runtime/test/OSSObjectStorageClient.test.ts', () => {
  let client: OSSObjectStorageClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OSSObjectStorageClient({
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      accessKeyId: 'test-id',
      accessKeySecret: 'test-secret',
      bucket: 'test-bucket',
    });
  });

  describe('put', () => {
    it('should pass Buffer to SDK put', async () => {
      mockPut.mockResolvedValue({});
      await client.put('threads/t1.json', '{"id":"t1"}');

      assert.equal(mockPut.mock.calls.length, 1);
      const [key, body] = mockPut.mock.calls[0];
      assert.equal(key, 'threads/t1.json');
      assert(Buffer.isBuffer(body));
      assert.equal(body.toString('utf-8'), '{"id":"t1"}');
    });
  });

  describe('get', () => {
    it('should return string when content is Buffer', async () => {
      mockGet.mockResolvedValue({
        content: Buffer.from('{"id":"t1"}', 'utf-8'),
      });
      const result = await client.get('threads/t1.json');
      assert.equal(result, '{"id":"t1"}');
    });

    it('should return string when content is non-Buffer', async () => {
      mockGet.mockResolvedValue({
        content: '{"id":"t1"}',
      });
      const result = await client.get('threads/t1.json');
      assert.equal(result, '{"id":"t1"}');
    });

    it('should return null when content is empty', async () => {
      mockGet.mockResolvedValue({ content: null });
      const result = await client.get('threads/t1.json');
      assert.equal(result, null);
    });

    it('should return null for NoSuchKey error', async () => {
      const err = new Error('Object not exists');
      (err as Error & { code: string }).code = 'NoSuchKey';
      mockGet.mockRejectedValue(err);

      const result = await client.get('threads/nonexistent.json');
      assert.equal(result, null);
    });

    it('should re-throw non-NoSuchKey errors', async () => {
      const err = new Error('Network failure');
      mockGet.mockRejectedValue(err);

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
      mockAppend.mockResolvedValue({ nextAppendPosition: '13' });
      await client.append('msgs.jsonl', '{"id":"m1"}\n');

      assert.equal(mockAppend.mock.calls.length, 1);
      const [key, buf, opts] = mockAppend.mock.calls[0];
      assert.equal(key, 'msgs.jsonl');
      assert(Buffer.isBuffer(buf));
      assert.equal(buf.toString('utf-8'), '{"id":"m1"}\n');
      assert.equal(opts.position, 0);
    });

    it('should use cached nextAppendPosition on subsequent appends', async () => {
      mockAppend.mockResolvedValueOnce({ nextAppendPosition: '13' });
      await client.append('msgs.jsonl', '{"id":"m1"}\n');

      mockAppend.mockResolvedValueOnce({ nextAppendPosition: '26' });
      await client.append('msgs.jsonl', '{"id":"m2"}\n');

      assert.equal(mockAppend.mock.calls.length, 2);
      assert.equal(mockAppend.mock.calls[1][2].position, 13);
    });

    it('should fall back to HEAD + retry on PositionNotEqualToLength', async () => {
      const posErr = new Error('Position mismatch');
      (posErr as Error & { code: string }).code = 'PositionNotEqualToLength';
      mockAppend.mockRejectedValueOnce(posErr);
      mockHead.mockResolvedValue({ res: { headers: { 'content-length': '50' } } });
      mockAppend.mockResolvedValueOnce({ nextAppendPosition: '63' });

      await client.append('msgs.jsonl', '{"id":"m1"}\n');

      // First attempt failed, then HEAD, then retry
      assert.equal(mockAppend.mock.calls.length, 2);
      assert.equal(mockHead.mock.calls.length, 1);
      assert.equal(mockAppend.mock.calls[1][2].position, 50);
    });

    it('should re-throw non-position errors', async () => {
      const err = new Error('Network failure');
      mockAppend.mockRejectedValue(err);

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
