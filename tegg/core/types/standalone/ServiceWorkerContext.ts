import { FetchEvent } from './fetch.ts';

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

export type ServiceWorkerFetchContext = ServiceWorkerContext<FetchEvent, Response>;
