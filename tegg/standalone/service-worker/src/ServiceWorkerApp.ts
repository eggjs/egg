// Keep Node.js runtime imports inside the optional serve() bridge.
import type http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ContextProtoProperty } from '@eggjs/service-worker-runtime';
import {
  StandaloneApp,
  StandaloneContext,
  type InitStandaloneAppOptions,
  type StandaloneAppOptions,
} from '@eggjs/standalone';
import type { StandaloneEvent } from '@eggjs/tegg-types';

/** Standalone options; application config comes from the entry module. */
export type ServiceWorkerAppOptions = StandaloneAppOptions;

export interface ServeOptions {
  port?: number;
  hostname?: string;
}

/** Runs standalone events directly or through a Node.js HTTP server. */
export class ServiceWorkerApp {
  readonly #app: StandaloneApp;
  readonly #initOptions: InitStandaloneAppOptions;
  readonly #servers: http.Server[] = [];
  #initialized = false;

  constructor(cwd: string, options?: ServiceWorkerAppOptions) {
    const standaloneOptions = options ?? {};
    const frameworkDeps = ServiceWorkerApp.#frameworkDeps(standaloneOptions);
    this.#app = new StandaloneApp({
      frameworkDeps,
      dump: standaloneOptions.dump,
      logger: standaloneOptions.logger,
      innerObjects: standaloneOptions.innerObjectHandlers,
    });
    this.#initOptions = {
      baseDir: cwd,
      name: standaloneOptions.name,
      env: standaloneOptions.env,
      dependencies: standaloneOptions.dependencies,
      manifest: standaloneOptions.manifest,
      loaderFS: standaloneOptions.loaderFS,
    };
  }

  // Discover framework modules from this package's eggModule dependencies.
  static #frameworkDeps(options?: ServiceWorkerAppOptions): StandaloneAppOptions['frameworkDeps'] {
    return [
      { baseDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), extraFilePattern: ['!test/**'] },
      ...(options?.frameworkDeps ?? []),
    ];
  }

  /** Scan the application and return metadata for a standalone bundle. */
  static async loadMetadata(
    cwd: string,
    options?: ServiceWorkerAppOptions,
  ): ReturnType<typeof StandaloneApp.loadMetadata> {
    return StandaloneApp.loadMetadata(cwd, { ...options, frameworkDeps: ServiceWorkerApp.#frameworkDeps(options) });
  }

  get app(): StandaloneApp {
    return this.#app;
  }

  async init(): Promise<void> {
    if (this.#initialized) {
      return;
    }
    await this.#app.init(this.#initOptions);
    this.#initialized = true;
  }

  /** Dispatch an event to the handler registered for its `type`. */
  async handleEvent<T = unknown>(event: StandaloneEvent): Promise<T> {
    await this.init();
    const context = new StandaloneContext();
    context.set(ContextProtoProperty.Event.contextKey, event);

    return await this.#app.run<T>(context);
  }

  async serve(options?: ServeOptions): Promise<http.Server> {
    await this.init();
    const nodeHttp = await import('node:http');
    const server = nodeHttp.createServer((req, res) => {
      this.#handleHttpRequest(req, res).catch((e) => {
        console.error('[service-worker] serve request failed:', e);
        if (!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
    });
    this.#servers.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(options?.port ?? 0, options?.hostname ?? '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    return server;
  }

  async #handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const { Readable } = await import('node:stream');
    const { pipeline } = await import('node:stream/promises');
    const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
    const method = (req.method ?? 'GET').toUpperCase();
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v);
        }
      }
    }
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const request = new Request(url, {
      method,
      headers,
      body: hasBody ? (Readable.toWeb(req) as unknown as BodyInit) : undefined,
      // @ts-expect-error duplex is required for stream bodies but missing from the lib type
      duplex: hasBody ? 'half' : undefined,
    });
    // Node.js has no worker isolate to extend with waitUntil().
    const event = { type: 'fetch', request, waitUntil: () => {} };
    const response = await this.handleEvent<Response>(event);
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      // Preserve Set-Cookie as separate header values.
      if (key === 'set-cookie') {
        continue;
      }
      res.setHeader(key, value);
    }
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }
    if (response.body) {
      await pipeline(Readable.fromWeb(response.body as any), res);
    } else {
      res.end();
    }
  }

  async destroy(): Promise<void> {
    await Promise.all(
      this.#servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
            server.closeAllConnections?.();
          }),
      ),
    );
    this.#servers.length = 0;
    await this.#app.destroy();
  }
}
