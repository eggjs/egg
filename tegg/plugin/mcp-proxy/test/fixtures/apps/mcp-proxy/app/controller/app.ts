import { randomUUID } from 'node:crypto';
import querystring from 'querystring';
import url from 'url';

import { MCPProtocols } from '@eggjs/tegg-types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport, EventStore } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import contentType from 'content-type';
import { Controller } from 'egg';
import getRawBody from 'raw-body';
import * as z from 'zod/v4';

const mcpServer = new McpServer(
  {
    name: 'tegg-mcp-demo-server',
    version: '1.0.0',
  },
  { capabilities: { logging: {} } },
);

// Register a simple tool that sends notifications over time
mcpServer.tool(
  'start-notification-stream',
  'Starts sending periodic notifications for testing resumability',
  {
    interval: z.number().describe('Interval in milliseconds between notifications').default(100),
    count: z.number().describe('Number of notifications to send (0 for 100)').default(50),
  },
  async ({ interval, count }, { sendNotification }) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let counter = 0;

    while (count === 0 || counter < count) {
      counter++;
      try {
        await sendNotification({
          method: 'notifications/message',
          params: {
            level: 'info',
            data: `Periodic notification #${counter}`,
          },
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
      await sleep(interval);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Started sending periodic notifications every ${interval}ms`,
        },
      ],
    };
  },
);

export class InMemoryEventStore implements EventStore {
  private events: Map<string, { streamId: string; message: JSONRPCMessage }> = new Map();

  /**
   * Generates a unique event ID for a given stream ID
   */
  private generateEventId(streamId: string): string {
    return `${streamId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Extracts the stream ID from an event ID
   */
  private getStreamIdFromEventId(eventId: string): string {
    const parts = eventId.split('_');
    return parts.length > 0 ? parts[0] : '';
  }

  /**
   * Stores an event with a generated event ID
   * Implements EventStore.storeEvent
   */
  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = this.generateEventId(streamId);
    this.events.set(eventId, { streamId, message });
    return eventId;
  }

  /**
   * Replays events that occurred after a specific event ID
   * Implements EventStore.replayEventsAfter
   */
  async replayEventsAfter(
    lastEventId: string,
    { send }: { send: (eventId: string, message: JSONRPCMessage) => Promise<void> },
  ): Promise<string> {
    if (!lastEventId || !this.events.has(lastEventId)) {
      return '';
    }

    // Extract the stream ID from the event ID
    const streamId = this.getStreamIdFromEventId(lastEventId);
    if (!streamId) {
      return '';
    }

    let foundLastEvent = false;

    // Sort events by eventId for chronological ordering
    const sortedEvents = [...this.events.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [eventId, { streamId: eventStreamId, message }] of sortedEvents) {
      // Only include events from the same stream
      if (eventStreamId !== streamId) {
        continue;
      }

      // Start sending events after we find the lastEventId
      if (eventId === lastEventId) {
        foundLastEvent = true;
        continue;
      }

      if (foundLastEvent) {
        await send(eventId, message);
      }
    }
    return streamId;
  }
}

const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

export default class App extends Controller {
  async ssePostHandler(req, res) {
    const sessionId = req.query?.sessionId ?? (querystring.parse(url.parse(req.url).query ?? '').sessionId as string);
    let transport: SSEServerTransport;
    const existingTransport = transports[sessionId];
    if (existingTransport instanceof SSEServerTransport) {
      transport = existingTransport;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Session exists but uses a different transport protocol',
        },
        id: null,
      });
      return;
    }
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(404).send({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Bad Request: No transport found for sessionId',
        },
        id: null,
      });
    }
  }

  async init() {
    // sse stream
    this.ctx.respond = false;
    this.ctx.set({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
    });
    const self = this;
    const transport = new SSEServerTransport('/message', this.ctx.res);
    // register handler and client demo
    this.app.mcpProxy.setProxyHandler(MCPProtocols.SSE, async (req, res) => {
      return await self.ssePostHandler(req, res);
    });
    transports[transport.sessionId] = transport;
    await this.app.mcpProxy.registerClient(transport.sessionId, process.pid);
    this.ctx.res.on('close', async () => {
      delete transports[transport.sessionId];
      await this.app.mcpProxy.unregisterClient(transport.sessionId);
    });
    // call
    const server = mcpServer;
    await server.connect(transport);
  }

  async message() {
    const detail = await this.app.mcpProxy.getClient(this.ctx.request.query.sessionId);
    if (detail?.pid !== process.pid) {
      await this.app.mcpProxy.proxyMessage(this.ctx, {
        detail: detail!,
        sessionId: this.ctx.request.query.sessionId,
        type: MCPProtocols.SSE,
      });
    } else {
      await this.ssePostHandler(this.ctx.req, this.ctx.res);
    }
  }

  async streamPostHandler(req, res) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'session id not have and run in proxy',
        },
        id: null,
      });
    } else {
      let transport: StreamableHTTPServerTransport;
      const existingTransport = transports[sessionId];
      if (existingTransport instanceof StreamableHTTPServerTransport) {
        transport = existingTransport;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Session exists but uses a different transport protocol',
          },
          id: null,
        });
        return;
      }
      if (transport) {
        await transport.handleRequest(req, res);
      } else {
        res.status(404).send({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Bad Request: No transport found for sessionId',
          },
          id: null,
        });
      }
    }
  }

  async allStream() {
    const sessionId = this.ctx.req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      const ct = contentType.parse(this.ctx.req.headers['content-type'] ?? '');

      const body = JSON.parse(
        await getRawBody(this.ctx.req, {
          limit: '4mb',
          encoding: ct.parameters.charset ?? 'utf-8',
        }),
      );

      if (isInitializeRequest(body)) {
        this.ctx.respond = false;
        this.ctx.set({
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
        });
        const eventStore = new InMemoryEventStore();
        const self = this;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore,
          onsessioninitialized: async (sessionId) => {
            transports[sessionId] = transport;
            this.app.mcpProxy.setProxyHandler(MCPProtocols.STREAM, async (req, res) => {
              return await self.streamPostHandler(req, res);
            });
            await this.app.mcpProxy.registerClient(sessionId, process.pid);
          },
        });
        transport.onclose = async () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
          }
          await this.app.mcpProxy.unregisterClient(sid!);
        };
        await mcpServer.connect(transport);

        await transport.handleRequest(this.ctx.req, this.ctx.res, body);
      } else {
        this.ctx.status = 400;
        this.ctx.body = {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        };
        return;
      }
    } else if (sessionId) {
      const detail = await this.app.mcpProxy.getClient(sessionId);
      if (detail?.pid !== process.pid) {
        await this.app.mcpProxy.proxyMessage(this.ctx, {
          detail: detail!,
          sessionId,
          type: MCPProtocols.STREAM,
        });
      } else {
        this.ctx.respond = false;
        this.ctx.set({
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
        });
        const transport = transports[sessionId] as StreamableHTTPServerTransport;
        await transport.handleRequest(this.ctx.req, this.ctx.res);
      }
    }
  }
}
