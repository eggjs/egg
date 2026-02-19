import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { describe, it } from 'vitest';
const majorVersion = parseInt(process.versions.node.split('.')[0], 10);

describe('test/HttpMCPClient.test.ts', () => {
  if (majorVersion < 18) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { HttpMCPClient } = require('../src/HttpMCPClient');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { startSSEServer, stopSSEServer } = require('./fixtures/sse-mcp-server/http');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { startStreamableServer, stopStreamableServer } = require('./fixtures/streamable-mcp-server/http');
  it('should work', async () => {
    await startStreamableServer();
    const client = new HttpMCPClient(
      {
        name: 'test',
        version: '1.0.0',
      },
      {
        transportType: 'STREAMABLE_HTTP',
        logger: console as any,
        url: 'http://127.0.0.1:17243',
      },
    );
    await client.init();
    const tools = await client.listTools();
    assert(tools);
    await stopStreamableServer();
  });
  it('should sse work', async () => {
    await startSSEServer();
    const client = new HttpMCPClient(
      {
        name: 'test',
        version: '1.0.0',
      },
      {
        transportType: 'SSE',
        logger: console as any,
        transportOptions: {
          requestInit: {
            headers: {
              'SOFA-TraceId': randomUUID(),
              'SOFA-RpcId': '0.1',
            },
          },
        },
        url: 'http://127.0.0.1:17233/mcp/sse',
      },
    );
    await client.init();
    const tools = await client.listTools();
    assert(tools);
    await stopSSEServer();
  });
});
