import assert from 'assert';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

import mm from '@eggjs/mock';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  CallToolRequest,
  CallToolResultSchema,
  ListToolsRequest,
  ListToolsResultSchema,
  LoggingMessageNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fetch } from 'urllib';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function listTools(client: Client) {
  const toolsRequest: ListToolsRequest = {
    method: 'tools/list',
    params: {},
  };
  const toolsResult = await client.request(toolsRequest, ListToolsResultSchema);

  const tools: { name: string; description?: string }[] = [];
  for (const tool of toolsResult.tools) {
    tools.push({
      name: tool.name,
      description: tool.description,
    });
  }
  return tools;
}
async function startNotificationTool(client: Client) {
  // Call the notification tool using reasonable defaults
  const request: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'start-notification-stream',
      arguments: {
        interval: 1000, // 1 second between notifications
        count: 5, // Send 5 notifications
      },
    },
  };
  const result = await client.request(request, CallToolResultSchema);

  const notifications: { text: string }[] = [];

  result.content.forEach((item) => {
    if (item.type === 'text') {
      notifications.push({
        text: item.text,
      });
    } else {
      notifications.push({
        text: (item as any).data!.toString(),
      });
    }
  });
  return notifications;
}

// FIXME: cluster mode tests require compiled dist/ files for worker processes.
// Running from TypeScript source causes incompatibilities:
// - --import=tsx/esm: ERR_REQUIRE_CYCLE_MODULE with egg core loader's require()
// - --import tsx: reflect-metadata/decorator failures
// - no tsx: SyntaxError on TypeScript decorators
// These tests should be re-enabled after building dist/ files or fixing the ESM/CJS interop.
describe.skip('plugin/mcp-proxy/test/proxy.test.ts', () => {
  if (parseInt(process.version.slice(1, 3)) > 17) {
    let app: any;
    let StreamableHTTPClientTransport: any;

    beforeAll(async () => {
      const mod = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      StreamableHTTPClientTransport = mod.StreamableHTTPClientTransport;

      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '..');
      });
      app = mm.cluster({
        baseDir: path.join(__dirname, 'fixtures/apps/mcp-proxy'),
        framework: path.dirname(require.resolve('egg/package.json')),
        workers: 3,
      });
      await app.ready();
    }, 30_000);

    afterAll(async () => {
      await app.close();
    });

    afterEach(() => {
      // mm.restore();
    });

    it('sse should work', async () => {
      const sseClient = new Client({
        name: 'sse-demo-client',
        version: '1.0.0',
      });
      const baseUrl = await app.httpRequest().get('/init').url;
      const sseTransport = new SSEClientTransport(new URL(baseUrl));
      const sseNotifications: { level: string; data: string }[] = [];
      sseClient.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        sseNotifications.push({ level: notification.params.level, data: notification.params.data as string });
      });
      await sseClient.connect(sseTransport);
      const tools = await listTools(sseClient);
      const notificationResp = await startNotificationTool(sseClient);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await sseTransport.close();
      assert.deepEqual(tools, [
        {
          name: 'start-notification-stream',
          description: 'Starts sending periodic notifications for testing resumability',
        },
      ]);
      assert.deepEqual(notificationResp, [{ text: 'Started sending periodic notifications every 1000ms' }]);
      assert.deepEqual(sseNotifications, [
        { level: 'info', data: 'Periodic notification #1' },
        { level: 'info', data: 'Periodic notification #2' },
        { level: 'info', data: 'Periodic notification #3' },
        { level: 'info', data: 'Periodic notification #4' },
        { level: 'info', data: 'Periodic notification #5' },
      ]);
    });

    it('streamable should work', async () => {
      const streamableClient = new Client({
        name: 'streamable-demo-client',
        version: '1.0.0',
      });
      const baseUrl = await app.httpRequest().post('/stream').url;
      const streamableTransport = new StreamableHTTPClientTransport(new URL(baseUrl), {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        fetch: async (...args: any[]) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const res = await fetch(...args);
          assert.deepEqual(res.headers.has('content-length'), !res.headers.has('transfer-encoding'));
          return res;
        },
      });
      const streamableNotifications: { level: string; data: string }[] = [];
      streamableClient.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        streamableNotifications.push({ level: notification.params.level, data: notification.params.data as string });
      });
      await streamableClient.connect(streamableTransport);
      const tools = await listTools(streamableClient);
      const notificationResp = await startNotificationTool(streamableClient);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await streamableTransport.terminateSession();
      await streamableClient.close();
      assert.deepEqual(tools, [
        {
          name: 'start-notification-stream',
          description: 'Starts sending periodic notifications for testing resumability',
        },
      ]);
      assert.deepEqual(notificationResp, [{ text: 'Started sending periodic notifications every 1000ms' }]);
      assert.deepEqual(streamableNotifications, [
        { level: 'info', data: 'Periodic notification #1' },
        { level: 'info', data: 'Periodic notification #2' },
        { level: 'info', data: 'Periodic notification #3' },
        { level: 'info', data: 'Periodic notification #4' },
        { level: 'info', data: 'Periodic notification #5' },
      ]);
    });
  }
});
