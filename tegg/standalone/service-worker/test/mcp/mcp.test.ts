import assert from 'node:assert';
import { Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp.ts';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils.ts';
import { adviceExecutionLog } from '../fixtures/mcp/McpTestAdvice.ts';

describe('standalone/service-worker/test/mcp/mcp.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;
  let client: Client;
  let baseUrl: string;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
    ({ app, server } = await TestUtils.createFetchApp('mcp'));
    const address = server.address();
    if (typeof address === 'object' && address) {
      baseUrl = `http://127.0.0.1:${address.port}`;
    }
  });

  after(async () => {
    await client?.close();
    server?.close();
    await app?.destroy();
  });

  it('should list tools', async () => {
    client = new Client({
      name: 'test-mcp-client',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp/test-server/stream`),
    );
    await client.connect(transport);

    const result = await client.listTools();
    const toolNames = result.tools.map(t => t.name);
    assert(toolNames.includes('echo'), 'should have echo tool');
    assert(toolNames.includes('add'), 'should have add tool');

    const echoTool = result.tools.find(t => t.name === 'echo');
    assert.strictEqual(echoTool?.description, 'Echo the input message');

    const addTool = result.tools.find(t => t.name === 'add');
    assert.strictEqual(addTool?.description, 'Add two numbers');
  });

  it('should call echo tool', async () => {
    client = new Client({
      name: 'test-mcp-client',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp/test-server/stream`),
    );
    await client.connect(transport);

    const result = await client.callTool({
      name: 'echo',
      arguments: { message: 'hello tegg' },
    });
    assert.deepStrictEqual(result, {
      content: [{ type: 'text', text: 'hello tegg' }],
    });
  });

  it('should call add tool', async () => {
    client = new Client({
      name: 'test-mcp-client',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp/test-server/stream`),
    );
    await client.connect(transport);

    const result = await client.callTool({
      name: 'add',
      arguments: { a: 3, b: 5 },
    });
    assert.deepStrictEqual(result, {
      content: [{ type: 'text', text: '8' }],
    });
  });

  it('should execute AOP middleware', async () => {
    adviceExecutionLog.length = 0;

    client = new Client({
      name: 'test-mcp-client',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp/test-server/stream`),
    );
    await client.connect(transport);

    await client.callTool({
      name: 'echo',
      arguments: { message: 'middleware test' },
    });

    // The middleware should have been executed for both the connect and callTool requests
    assert(adviceExecutionLog.length > 0, 'middleware should have been executed');
    assert(adviceExecutionLog.includes('before'), 'middleware before should have been called');
    assert(adviceExecutionLog.includes('after'), 'middleware after should have been called');
  });
});
