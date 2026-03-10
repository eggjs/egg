import type { ServerResponse } from 'node:http';

import type { SSEWriter } from './SSEWriter.ts';

export class HttpSSEWriter implements SSEWriter {
  private res: ServerResponse;
  private _closed = false;
  private closeCallbacks: Array<() => void> = [];
  private headersSent = false;
  private readonly onResClose: () => void;

  constructor(res: ServerResponse) {
    this.res = res;
    this.onResClose = () => {
      this._closed = true;
      for (const cb of this.closeCallbacks) cb();
      this.closeCallbacks.length = 0;
    };
    res.on('close', this.onResClose);
  }

  /** Lazily write headers on first event — avoids sending corrupt headers if constructor throws. */
  private ensureHeaders(): void {
    if (this.headersSent) return;
    this.headersSent = true;
    this.res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
  }

  writeEvent(event: string, data: unknown): void {
    if (this._closed) return;
    this.ensureHeaders();
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  get closed(): boolean {
    return this._closed;
  }

  end(): void {
    if (!this._closed) {
      this._closed = true;
      this.res.off('close', this.onResClose);
      this.closeCallbacks.length = 0;
      this.res.end();
    }
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }
}
