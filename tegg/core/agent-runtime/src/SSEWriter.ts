import type { ServerResponse } from 'node:http';

/**
 * Abstract interface for writing SSE events.
 * Decouples AgentRuntime from HTTP transport details.
 */
export interface SSEWriter {
  /** Write an SSE event with the given name and JSON-serializable data. */
  writeEvent(event: string, data: unknown): void;
  /** Whether the underlying connection has been closed. */
  readonly closed: boolean;
  /** End the SSE stream. */
  end(): void;
  /** Register a callback for when the client disconnects. */
  onClose(callback: () => void): void;
}

/**
 * SSEWriter implementation backed by a Node.js http.ServerResponse.
 */
export class NodeSSEWriter implements SSEWriter {
  private readonly res: ServerResponse;

  constructor(res: ServerResponse) {
    this.res = res;
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  }

  writeEvent(event: string, data: unknown): void {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }

  get closed(): boolean {
    return this.res.writableEnded;
  }

  end(): void {
    if (!this.res.writableEnded) {
      this.res.end();
    }
  }

  onClose(callback: () => void): void {
    this.res.once('close', callback);
  }
}
