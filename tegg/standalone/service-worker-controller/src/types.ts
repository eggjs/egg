export interface FetchEvent extends Event {
  request: Request;
  waitUntil(f: Promise<any>): void;
  respondWith(r: Response | PromiseLike<Response>): void;
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
 * DNS-rebinding protection for the MCP transport, forwarded to the SDK's
 * web-standard transport. When `allowedHosts`/`allowedOrigins` are configured
 * the SDK validates the request Host/Origin; enable-protection defaults on once
 * either list is set. Left empty (the default) there is no host/origin gate —
 * set it before exposing the MCP endpoint beyond loopback.
 */
export interface MCPTransportOptions {
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
