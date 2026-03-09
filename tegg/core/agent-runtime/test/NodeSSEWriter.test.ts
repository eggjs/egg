import assert from 'node:assert';
import { EventEmitter } from 'node:events';

import { describe, it, beforeEach } from 'vitest';

import { NodeSSEWriter } from '../src/NodeSSEWriter.ts';

/**
 * Minimal mock of Node.js ServerResponse for testing NodeSSEWriter.
 * Captures writeHead/write/end calls and emits 'close' on demand.
 */
class MockServerResponse extends EventEmitter {
  writtenHead: { statusCode: number; headers: Record<string, string> } | null = null;
  chunks: string[] = [];
  ended = false;

  writeHead(statusCode: number, headers: Record<string, string>): void {
    this.writtenHead = { statusCode, headers };
  }

  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }

  end(): void {
    this.ended = true;
  }
}

describe('test/NodeSSEWriter.test.ts', () => {
  let res: MockServerResponse;

  beforeEach(() => {
    res = new MockServerResponse();
  });

  it('should delay headers until first writeEvent', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);

    // Headers not sent yet after construction
    assert.equal(res.writtenHead, null);
    assert.equal(res.chunks.length, 0);

    writer.writeEvent('test', { foo: 'bar' });

    // Now headers should be sent
    assert.ok(res.writtenHead);
    assert.equal(res.writtenHead.statusCode, 200);
  });

  it('should use lowercase header keys', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);
    writer.writeEvent('ping', {});

    assert.ok(res.writtenHead);
    assert.equal(res.writtenHead.headers['content-type'], 'text/event-stream');
    assert.equal(res.writtenHead.headers['cache-control'], 'no-cache');
    assert.equal(res.writtenHead.headers['connection'], 'keep-alive');
  });

  it('should format SSE events correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);
    writer.writeEvent('message', { text: 'hello' });

    assert.equal(res.chunks.length, 1);
    assert.equal(res.chunks[0], 'event: message\ndata: {"text":"hello"}\n\n');
  });

  it('should not write after connection closes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);

    // Simulate client disconnect
    res.emit('close');

    assert.equal(writer.closed, true);
    writer.writeEvent('late', { data: 'ignored' });

    // No headers sent, no chunks written
    assert.equal(res.writtenHead, null);
    assert.equal(res.chunks.length, 0);
  });

  it('should trigger onClose callbacks when connection closes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);
    const calls: number[] = [];

    writer.onClose(() => calls.push(1));
    writer.onClose(() => calls.push(2));

    res.emit('close');

    assert.deepStrictEqual(calls, [1, 2]);
  });

  it('should handle end() idempotently', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);

    assert.equal(writer.closed, false);

    writer.end();
    assert.equal(writer.closed, true);
    assert.equal(res.ended, true);

    // Reset flag to verify second end() doesn't call res.end() again
    res.ended = false;
    writer.end();
    assert.equal(res.ended, false); // Not called again
  });

  it('should write multiple events sequentially', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);

    writer.writeEvent('event1', { n: 1 });
    writer.writeEvent('event2', { n: 2 });
    writer.writeEvent('event3', { n: 3 });

    assert.equal(res.chunks.length, 3);
    assert.equal(res.chunks[0], 'event: event1\ndata: {"n":1}\n\n');
    assert.equal(res.chunks[1], 'event: event2\ndata: {"n":2}\n\n');
    assert.equal(res.chunks[2], 'event: event3\ndata: {"n":3}\n\n');

    // Headers sent only once
    assert.ok(res.writtenHead);
  });

  it('should start with closed=false', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writer = new NodeSSEWriter(res as any);
    assert.equal(writer.closed, false);
  });
});
