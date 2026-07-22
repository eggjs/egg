import assert from 'node:assert/strict';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import {
  ServiceWorkerMcpRouter,
  type McpServerMountContext,
  type McpTransportProvider,
  type ServiceWorkerFetchContext,
} from '@eggjs/service-worker-controller';
import { TeggScope } from '@eggjs/tegg-types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { ServiceWorkerApp } from '../src/index.ts';
import { MCP_MW_CALLS } from './fixtures/hello-app/mcpMiddlewareRecorder.ts';

const MCP_HEADERS = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
};

function parseSSEMessage(text: string): any {
  // stateless streamable http replies as SSE frames: `event: message\ndata: {...}`
  const dataLine = text
    .split('\n')
    .reverse()
    .find((line) => line.startsWith('data:'));
  assert(dataLine, `no data line in: ${text}`);
  return JSON.parse(dataLine.slice('data:'.length).trim());
}

describe('standalone/service-worker/test/MCP.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'));
    server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    base = `http://${address}:${port}`;
  });

  afterAll(async () => {
    await app.destroy();
  });

  it('should list tools over stateless streamable http', async () => {
    const res = await fetch(`${base}/mcp/calc/stream`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.equal(res.status, 200);
    const message = parseSSEMessage(await res.text());
    const tools = message.result.tools as Array<{ name: string; description?: string }>;
    assert.deepEqual(
      tools.map((t) => t.name),
      ['add'],
    );
    assert.equal(tools[0].description, 'add two numbers');
  });

  it('should call a tool with schema-bound args', async () => {
    const res = await fetch(`${base}/mcp/calc/stream`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'add', arguments: { a: 40, b: 2 } },
      }),
    });
    assert.equal(res.status, 200);
    const message = parseSSEMessage(await res.text());
    assert.deepEqual(message.result.content, [{ type: 'text', text: 'hello, mcp: 42' }]);
  });

  it('should reject non-POST with 405 jsonrpc error', async () => {
    const res = await fetch(`${base}/mcp/calc/stream`);
    assert.equal(res.status, 405);
    const body = (await res.json()) as { error: { code: number } };
    assert.equal(body.error.code, -32000);
  });

  it('should run controller + method middlewares only for the targeted tool', async () => {
    MCP_MW_CALLS.length = 0;
    await fetch(`${base}/mcp/mwcalc/stream`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.deepEqual(MCP_MW_CALLS, []);

    const res = await fetch(`${base}/mcp/mwcalc/stream`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'echo', arguments: { v: 'hi' } },
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-controller-advice'), 'applied');
    const message = parseSSEMessage(await res.text());
    assert.deepEqual(message.result.content, [{ type: 'text', text: 'hi' }]);
    assert.deepEqual(MCP_MW_CALLS, [
      'controller-mw',
      'controller-advice-before',
      'tool-mw',
      'controller-advice-after:200',
      'tool-advice:echo:hi',
    ]);
  });

  it('should serve a full MCP SDK client round-trip', async () => {
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp/calc`));
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      assert.deepEqual(
        tools.map((t) => t.name),
        ['add'],
      );
      const result = await client.callTool({ name: 'add', arguments: { a: 1, b: 2 } });
      assert.deepEqual(result.content, [{ type: 'text', text: 'hello, mcp: 3' }]);
    } finally {
      await client.close();
    }
  });
});

describe('standalone/service-worker/test/MCP.test.ts mcpAuthHandler', () => {
  let app: ServiceWorkerApp;
  let base: string;

  beforeAll(async () => {
    app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'), {
      innerObjectHandlers: {
        mcpAuthHandler: [
          {
            obj: {
              async authenticate(request: Request) {
                if (request.headers.get('x-mcp-token') !== 'secret') {
                  return new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'missing x-mcp-token' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json' },
                  });
                }
                return undefined;
              },
            },
          },
        ],
      },
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    base = `http://${address}:${port}`;
  });

  afterAll(async () => {
    await app.destroy();
  });

  it('should reject MCP requests failing the auth hook', async () => {
    const res = await fetch(`${base}/mcp/calc/stream`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  it('should pass MCP requests satisfying the auth hook', async () => {
    const res = await fetch(`${base}/mcp/calc/stream`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, 'x-mcp-token': 'secret' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.equal(res.status, 200);
    const message = parseSSEMessage(await res.text());
    assert.equal(message.result.tools.length, 1);
  });
});

describe('standalone/service-worker/test/MCP.test.ts hardening', () => {
  it('should reject a request whose Host is not in allowedHosts', async () => {
    const app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'), {
      env: 'allowedhost',
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://${address}:${port}/mcp/calc/stream`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });
      assert.equal(res.status, 403);
    } finally {
      await app.destroy();
    }
  });

  it('should still serve when the auth hook consumes the request body', async () => {
    const seen: unknown[] = [];
    const app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'), {
      innerObjectHandlers: {
        mcpAuthHandler: [
          {
            obj: {
              async authenticate(request: Request) {
                // Auth reads the one-shot body; the SDK must still parse via the
                // pre-read parsedBody rather than the now-consumed stream.
                seen.push(await request.json());
                return undefined;
              },
            },
          },
        ],
      },
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://${address}:${port}/mcp/calc/stream`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'add', arguments: { a: 2, b: 3 } },
        }),
      });
      assert.equal(res.status, 200);
      const message = parseSSEMessage(await res.text());
      assert.deepEqual(message.result.content, [{ type: 'text', text: 'hello, mcp: 5' }]);
      assert.equal(seen.length, 1);
    } finally {
      await app.destroy();
    }
  });
});

describe('standalone/service-worker/test/MCP.test.ts transport selection', () => {
  it('should mount a host-registered transport when config.mcp.transport selects it', async () => {
    const seen: Array<string | undefined> = [];
    // A custom provider owns route mounting and can reuse shared MCP capabilities.
    const fakeProvider: McpTransportProvider = {
      mount(context: McpServerMountContext) {
        seen.push(context.serverName);
        Reflect.apply(context.router.post, context.router, [
          'fakeTransport',
          `${context.basePath}/stream`,
          async (ctx: ServiceWorkerFetchContext) => {
            const denied = await context.authenticate(ctx.event.request);
            if (denied) {
              ctx.response = denied;
              return;
            }
            const helper = await context.createServerHelper();
            ctx.response = Response.json({
              via: 'fake',
              server: context.serverName ?? 'default',
              tools: context.registration.tools.length,
              hasServer: Boolean(helper.server),
            });
          },
        ]);
      },
    };

    const app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'), {
      env: 'faketransport',
    });
    // Transport providers are scoped to one app.
    TeggScope.run(app.app.scopeBag, () => {
      ServiceWorkerMcpRouter.registerTransport('fake', fakeProvider);
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://${address}:${port}/mcp/calc/stream`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { via: 'fake', server: 'calc', tools: 1, hasServer: true });
      assert.ok(seen.includes('calc'));
    } finally {
      await app.destroy();
    }
  });

  it('should fall back to the built-in web-standard transport for an unknown name', async () => {
    const app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'), {
      env: 'faketransport',
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://${address}:${port}/mcp/calc/stream`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });
      assert.equal(res.status, 200);
      const message = parseSSEMessage(await res.text());
      assert.equal(message.result.tools.length, 1);
    } finally {
      await app.destroy();
    }
  });
});
