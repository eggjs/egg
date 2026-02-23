import http from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import * as z from 'zod/v4';

// Create an MCP server
const server = new McpServer({
  name: 'Demo',
  version: '1.0.0',
});

// Add an addition tool
server.registerTool(
  'add',
  {
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }),
);

// Add a dynamic greeting resource
server.registerResource('greeting', 'greeting://{name}', {}, async (uri) => ({
  contents: [
    {
      uri: uri.href,
      text: `Hello, ${uri.hostname}!`,
    },
  ],
}));

const transports = {};
export const headers = {};

export let httpServer;
export async function startSSEServer(port = 17233) {
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(`http://127.0.0.1:${port}${req.url!}`);
    const headerKey = `${req.method}${url.pathname}`;
    const serverCode = req.headers['x-mcp-server-code'] as string;
    headers[serverCode] = headers[serverCode] || {};
    headers[serverCode][headerKey] = headers[serverCode][headerKey] || [];
    headers[serverCode][headerKey].push(req.headers);
    if (req.method === 'GET') {
      const transport = new SSEServerTransport('/mcp', res);
      transports[transport.sessionId] = transport;
      // Connect the transport to the MCP server
      await server.connect(transport);
    } else if (req.method === 'POST') {
      const sessionId = url.searchParams.get('sessionId');
      // const chunks: Buffer[] = [];
      // for await (const chunk of req) {
      //   chunks.push(chunk);
      // }
      // const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      const transport = transports[sessionId!] as SSEServerTransport;
      await transport.handlePostMessage(req, res);
      res.statusCode = 201;
      res.end();
    }
  });
  return new Promise<void>((resolve) => {
    httpServer.listen(port, resolve);
  });
}

export async function stopSSEServer() {
  server.close();
}
