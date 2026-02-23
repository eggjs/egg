import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { describe, it, beforeAll } from 'vitest';

describe('test/HttpMCPClient.test.ts', () => {
  let HttpMCPClient: any;
  let startSSEServer: any;
  let stopSSEServer: any;
  let startStreamableServer: any;
  let stopStreamableServer: any;

  beforeAll(async () => {
    const clientMod = await import('../src/HttpMCPClient.ts');
    HttpMCPClient = clientMod.HttpMCPClient;
    const sseMod = await import('./fixtures/sse-mcp-server/http.ts');
    startSSEServer = sseMod.startSSEServer;
    stopSSEServer = sseMod.stopSSEServer;
    const streamMod = await import('./fixtures/streamable-mcp-server/http.ts');
    startStreamableServer = streamMod.startStreamableServer;
    stopStreamableServer = streamMod.stopStreamableServer;
  });

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
