import type { FetchEvent } from '@eggjs/tegg-types';

import type { ServiceWorkerFetchContext } from './http/ServiceWorkerFetchContext.ts';

/** Creates the context for a fetch request. */
export interface FetchContextFactory {
  create(init: ServiceWorkerContextInit<FetchEvent>): ServiceWorkerFetchContext;
}

/** Maps an unhandled controller error to a response. */
export interface ErrorResponseMapper {
  toResponse(error: unknown, ctx: ServiceWorkerFetchContext): Response | undefined;
}

/** Returns a response to reject an MCP request, or undefined to allow it. */
export interface MCPAuthHandler {
  authenticate(request: Request): Promise<Response | undefined>;
}

/** MCP settings read from the entry module's `module.yml`. */
export interface MCPTransportOptions {
  /** Built-in `web` transport or a name registered with `registerTransport()`. */
  transport?: string;
  /** Host header allow-list passed to the MCP SDK. */
  allowedHosts?: string[];
  /** Origin header allow-list passed to the MCP SDK. */
  allowedOrigins?: string[];
  /** Defaults to true when either allow-list is configured. */
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
