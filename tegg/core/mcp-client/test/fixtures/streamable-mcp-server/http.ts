import http from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

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
server.registerResource(
  'greeting',
  'greeting://{name}',
  {},
  // @ts-ignore
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  }),
);

export const headers: Record<string, any> = {};

export let httpServer: http.Server;
export async function startStreamableServer(port = 17243) {
  const httpServer = http.createServer(async (req, res) => {
    const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const url = new URL(`http://127.0.0.1:${port}${req.url!}`);
    const headerKey = `${req.method}${url.pathname}`;
    const serverCode = req.headers['x-mcp-server-code'] as string;
    headers[serverCode] = headers[serverCode] || {};
    headers[serverCode][headerKey] = headers[serverCode][headerKey] || [];
    headers[serverCode][headerKey].push(req.headers);
    if (req.method === 'POST') {
      try {
        const transport: typeof StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        await transport.handleRequest(req, res);
        res.on('close', () => {
          console.log('Request closed');
          transport.close();
          server.close();
        });
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
              },
              id: null,
            }),
          );
        }
      }
    } else {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found',
          },
          id: null,
        }),
      );
    }
  });
  return new Promise<void>((resolve) => {
    httpServer.listen(port, resolve);
  });
}

export async function stopStreamableServer() {
  server.close();
}
