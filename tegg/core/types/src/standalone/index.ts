/** Event dispatched by the standalone runtime. */
export interface StandaloneEvent {
  type: string;
}

/** Fetch request dispatched by a service-worker host. */
export interface FetchEvent extends StandaloneEvent {
  type: 'fetch';
  request: Request;
  /** Keep asynchronous work alive after the response is returned. */
  waitUntil: (f: Promise<any>) => void;
}

/** Public controller context exposed by a service-worker fetch host. */
export interface ServiceWorkerFetchContext {
  readonly event: FetchEvent;
  readonly url: URL;
  readonly method: string;
  readonly path: string;
  readonly host: string;
  readonly params: Record<string, string>;
  readonly responseHeaders: Headers;
  response: Response | undefined;
  body: any;
}
