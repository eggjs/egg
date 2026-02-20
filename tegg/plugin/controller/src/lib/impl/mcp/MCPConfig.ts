import { randomUUID } from 'node:crypto';

import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import type { EventStore } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Application, Context } from 'egg';

export interface MCPConfigOptions {
  sseInitPath: string;
  sseMessagePath: string;
  streamPath: string;
  statelessStreamPath: string;
  ssePingEnabled?: boolean;
  streamPingEnabled?: boolean;
  pingElapsed?: number;
  pingInterval?: number;
  sessionIdGenerator?: (ctx: Context) => string;
  eventStore?: EventStore;
  sseHeartTime?: number;
  multipleServer?: Record<string, Partial<MCPConfigOptions>>;
}

export class MCPConfig {
  private _sseInitPath: string;
  private _sseMessagePath: string;
  private _streamPath: string;
  private _statelessStreamPath: string;
  private _sessionIdGenerator: (ctx: Context) => string;
  private _eventStore: EventStore;
  private _sseHeartTime: number;

  private _pingElapsed: number;
  private _pingInterval: number;
  private _ssePingEnabled: boolean;
  private _streamPingEnabled: boolean;

  private _multipleServer: Record<string, Partial<MCPConfigOptions>>;

  constructor(options: MCPConfigOptions) {
    this._sessionIdGenerator = options.sessionIdGenerator ?? (() => randomUUID());
    this._sseInitPath = options.sseInitPath;
    this._sseMessagePath = options.sseMessagePath;
    this._streamPath = options.streamPath;
    this._statelessStreamPath = options.statelessStreamPath;
    this._eventStore = options.eventStore ?? new InMemoryEventStore();
    this._sseHeartTime = options.sseHeartTime ?? 25000;
    this._pingElapsed = options.pingElapsed ?? 10 * 60 * 1000;
    this._pingInterval = options.pingInterval ?? 5 * 1000;
    this._ssePingEnabled = options.ssePingEnabled ?? false;
    this._streamPingEnabled = options.streamPingEnabled ?? false;

    this._multipleServer = options.multipleServer ?? {};
  }

  getSseInitPath(name?: string): string {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.sseInitPath) {
        return config.sseInitPath;
      }
      return `/mcp/${name}/sse`;
    }
    return this._sseInitPath;
  }

  getSseMessagePath(name?: string): string {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.sseMessagePath) {
        return config.sseMessagePath;
      }
      return `/mcp/${name}/message`;
    }
    return this._sseMessagePath;
  }

  getStreamPath(name?: string): string {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.streamPath) {
        return config.streamPath;
      }
      return `/mcp/${name}/stream`;
    }
    return this._streamPath;
  }

  getStatelessStreamPath(name?: string): string {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.statelessStreamPath) {
        return config.statelessStreamPath;
      }
      return `/mcp/${name}/stateless/stream`;
    }
    return this._statelessStreamPath;
  }

  getSessionIdGenerator(name?: string): (ctx: Context) => string {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.sessionIdGenerator) {
        return config.sessionIdGenerator;
      }
      return () => randomUUID();
    }
    return this._sessionIdGenerator;
  }

  getEventStore(name?: string): EventStore {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.eventStore) {
        return config.eventStore;
      }
      return new InMemoryEventStore();
    }
    return this._eventStore;
  }

  getSseHeartTime(name?: string): number {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.sseHeartTime) {
        return config.sseHeartTime;
      }
      return 25000;
    }
    return this._sseHeartTime;
  }

  getMultipleServerNames(): string[] {
    return Object.keys(this._multipleServer);
  }

  getPingElapsed(name?: string): number {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.pingElapsed !== undefined) {
        return config.pingElapsed;
      }
      return 10 * 60 * 1000;
    }
    return this._pingElapsed;
  }

  getPingInterval(name?: string): number {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.pingInterval !== undefined) {
        return config.pingInterval;
      }
      return 5 * 1000;
    }
    return this._pingInterval;
  }

  getSsePingEnabled(name?: string): boolean {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.ssePingEnabled !== undefined) {
        return config.ssePingEnabled;
      }
      return false;
    }
    return this._ssePingEnabled;
  }

  getStreamPingEnabled(name?: string): boolean {
    if (name) {
      const config = this._multipleServer[name];
      if (config?.streamPingEnabled !== undefined) {
        return config.streamPingEnabled;
      }
      return false;
    }
    return this._streamPingEnabled;
  }

  setMultipleServerPath(app: Application, name: string): void {
    if (!(app.config.mcp as MCPConfigOptions).multipleServer) {
      (app.config.mcp as MCPConfigOptions).multipleServer = {};
    }
    (app.config.mcp as MCPConfigOptions).multipleServer![name] = {
      sseInitPath: `/mcp/${name}/sse`,
      sseMessagePath: `/mcp/${name}/message`,
      streamPath: `/mcp/${name}/stream`,
      statelessStreamPath: `/mcp/${name}/stateless/stream`,
      ...app.config.mcp.multipleServer?.[name],
    };
  }
}
