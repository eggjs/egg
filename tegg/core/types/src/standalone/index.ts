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
