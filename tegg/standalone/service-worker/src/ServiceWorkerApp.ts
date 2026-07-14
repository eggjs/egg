import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { FetchEventImpl, type MCPAuthHandler, type MCPTransportOptions } from '@eggjs/service-worker-controller';
import { ContextProtoProperty } from '@eggjs/service-worker-runtime';
import {
  StandaloneApp,
  StandaloneContext,
  type InitStandaloneAppOptions,
  type StandaloneAppOptions,
} from '@eggjs/standalone';

export interface ServiceWorkerAppOptions extends StandaloneAppOptions {
  /** Injected as the `config` inner object (BackgroundTaskHelper reads `config.backgroundTask.timeout`). */
  config?: Record<string, any>;
  /** Auth hook for MCP routes; the default lets every request through. */
  mcpAuthHandler?: MCPAuthHandler;
  /** DNS-rebinding protection for the MCP transport (Host/Origin allow-lists). */
  mcp?: MCPTransportOptions;
}

const PASS_THROUGH_MCP_AUTH_HANDLER: MCPAuthHandler = {
  async authenticate() {
    return undefined;
  },
};

export interface ServeOptions {
  port?: number;
  hostname?: string;
}

/**
 * The service worker facade over StandaloneApp: its framework modules (runtime +
 * fetch controller) are auto-discovered from this package's deps, then it serves
 * events either embedded (`handleEvent`) or over node:http (`serve`).
 */
export class ServiceWorkerApp {
  readonly #app: StandaloneApp;
  readonly #initOptions: InitStandaloneAppOptions;
  readonly #servers: http.Server[] = [];
  #initialized = false;

  constructor(cwd: string, options?: ServiceWorkerAppOptions) {
    const { config, mcpAuthHandler, mcp, ...standaloneOptions } = options ?? {};
    // Scan this package's own root so its framework-module deps
    // (service-worker-runtime + -controller) are auto-discovered via the
    // node_modules eggModule convention. `!test/**` keeps their test fixtures out.
    const frameworkDeps: StandaloneAppOptions['frameworkDeps'] = [
      {
        baseDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
        extraFilePattern: ['!test/**'],
      },
      ...(standaloneOptions.frameworkDeps ?? []),
    ];
    // Construction-time wiring (capabilities + provided objects); the app
    // binding (baseDir/name/env and scan sources) goes to init() below —
    // the StandaloneAppInit/InitStandaloneAppOptions split.
    this.#app = new StandaloneApp({
      frameworkDeps,
      dump: standaloneOptions.dump,
      logger: standaloneOptions.logger,
      innerObjects: {
        config: [{ obj: config ?? {} }],
        mcpAuthHandler: [{ obj: mcpAuthHandler ?? PASS_THROUGH_MCP_AUTH_HANDLER }],
        mcpTransportOptions: [{ obj: mcp ?? {} }],
        ...standaloneOptions.innerObjectHandlers,
      },
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

  async handleEvent<T = unknown>(event: Event): Promise<T> {
    // Auto-init so embedded callers can hand over a fetch event without a
    // separate init()/serve() step; init() is idempotent.
    await this.init();
    const context = new StandaloneContext();
    context.set(ContextProtoProperty.Event.contextKey, event);

    return await this.#app.run<T>(context);
  }

  async serve(options?: ServeOptions): Promise<http.Server> {
    await this.init();
    const server = http.createServer((req, res) => {
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
    const event = new FetchEventImpl(request);
    const response = await this.handleEvent<Response>(event);
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      // `entries()` folds multiple Set-Cookie into one comma-joined value, which
      // corrupts cookies (commas appear inside Expires); write them as an array.
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
    event.waitUntilSettled().catch(() => {
      /* logged by the tasks themselves */
    });
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
