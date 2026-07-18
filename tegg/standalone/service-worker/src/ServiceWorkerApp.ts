// node:http / node:stream are used ONLY by the optional node:http `serve()`
// bridge, and are imported lazily inside it (see `serve`/`#handleHttpRequest`).
// The type-only import is erased at build, so importing this module and using the
// fetch-native `handleEvent()` path never loads them — the fetch runtime (e.g. a
// Service Worker / Cloudflare Worker) has no `node:http`.
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

/**
 * The service worker app has no bespoke options of its own — everything is a
 * standalone option. Config values come from the app's `module.yml`; capability
 * objects (mcpAuthHandler, fetchContextFactory, errorResponseMapper) are provided
 * through `innerObjectHandlers`.
 */
export type ServiceWorkerAppOptions = StandaloneAppOptions;

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
    const standaloneOptions = options ?? {};
    const frameworkDeps = ServiceWorkerApp.#frameworkDeps(standaloneOptions);
    // Construction-time wiring (capabilities + provided objects); the app
    // binding (baseDir/name/env and scan sources) goes to init() below —
    // the StandaloneAppInit/InitStandaloneAppOptions split.
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

  // Scan this package's own root so its framework-module deps (service-worker-runtime
  // + -controller) are auto-discovered via the node_modules eggModule convention.
  // `!test/**` keeps their test fixtures out.
  static #frameworkDeps(options?: ServiceWorkerAppOptions): StandaloneAppOptions['frameworkDeps'] {
    return [
      { baseDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), extraFilePattern: ['!test/**'] },
      ...(options?.frameworkDeps ?? []),
    ];
  }

  /**
   * Scan-only manifest generation for bundlers: returns the tegg manifest
   * (moduleReferences + moduleDescriptors) for the service worker app at `cwd`,
   * so a bundle boots with no runtime fs scanning. Mirrors the constructor's
   * framework-dep discovery; runs at build time (needs fs).
   */
  static async loadMetadata(cwd: string, options?: ServiceWorkerAppOptions) {
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

  /**
   * The entry: dispatch an event to its `@EventHandlerProto` handler by
   * `event.type`. It is protocol-agnostic — only `type` is read here; each
   * protocol handler reads its own payload (e.g. `request`) off the event. A
   * native SW/edge `FetchEvent` satisfies this, so both worker formats wire in:
   *
   *   SW:     addEventListener('fetch', e => e.respondWith(app.handleEvent(e)))
   *   module: from `export default { fetch }`, build a fetch event
   *           `{ type: 'fetch', request, waitUntil: p => ctx.waitUntil(p) }` and
   *           hand it to `handleEvent`.
   */
  async handleEvent<T = unknown>(event: StandaloneEvent): Promise<T> {
    // Auto-init so embedded callers can hand over an event without a separate
    // init()/serve() step; init() is idempotent.
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
    // node:http has no isolate to keep alive, so waitUntil is a no-op placeholder
    // until real background support lands.
    const event = { type: 'fetch', request, waitUntil: () => {} };
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
