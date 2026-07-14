import type { ServiceWorkerFetchContext } from './http/ServiceWorkerFetchContext.ts';

export interface FetchEvent extends Event {
  request: Request;
  waitUntil(f: Promise<any>): void;
  respondWith(r: Response | PromiseLike<Response>): void;
}

/**
 * Optional host hook to build the per-request fetch context. Provide it as the
 * `fetchContextFactory` inner object to return a richer context (logger/tracer/
 * user); when absent the plain {@link ServiceWorkerFetchContext} is used.
 */
export interface FetchContextFactory {
  create(init: ServiceWorkerContextInit<FetchEvent>): ServiceWorkerFetchContext;
}

/**
 * Optional host hook to turn an unhandled controller error into a Response.
 * Provide it as the `errorResponseMapper` inner object to map your own error
 * types (business status/body); return `undefined` to fall back to the
 * framework's unified `{ code, message }` 500.
 */
export interface ErrorResponseMapper {
  toResponse(error: unknown, ctx: ServiceWorkerFetchContext): Response | undefined;
}

/**
 * The auth extension point for MCP routes. The host provides an
 * implementation via `ServiceWorkerAppOptions.mcpAuthHandler` (backed by the
 * `mcpAuthHandler` inner object); the default passes every request through.
 * Return a Response to reject the request, or undefined to let it in.
 */
export interface MCPAuthHandler {
  authenticate(request: Request): Promise<Response | undefined>;
}

/**
 * MCP transport config, read from the app-wide `config` inner object under the
 * `mcp` key (the app's `module.yml`, or a programmatic `config` override).
 *
 * `transport` selects which transport mounts: the built-in `'web'` (web-standard
 * streamable HTTP, the default) or a host-registered alternative by name (see
 * `ServiceWorkerMcpRouter.registerTransport`) — e.g. a node-mock SSE + streamable
 * transport. An unknown name falls back to the built-in.
 *
 * The `allowedHosts`/`allowedOrigins`/`enableDnsRebindingProtection` fields are
 * DNS-rebinding protection forwarded to the SDK's web-standard transport: when a
 * list is configured the SDK validates the request Host/Origin, and protection
 * defaults on once either list is set. Left empty (the default) there is no
 * host/origin gate — set it before exposing the MCP endpoint beyond loopback.
 */
export interface MCPTransportOptions {
  transport?: string;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  enableDnsRebindingProtection?: boolean;
}

export interface ServiceWorkerContextInit<T> {
  event: T;
}

export interface ServiceWorkerContext<Event, Response> {
  event: Event;
  get response(): Response | undefined;
  set response(response: Response);

  get body(): any | undefined;
  set body(body: any);
}
