import { ServiceWorkerContext, ServiceWorkerContextInit } from '@eggjs/tegg-types/standalone';

export abstract class BaseServiceWorkerContextImpl<Event, Response> implements ServiceWorkerContext<Event, Response> {
  event: Event;
  #response: Response;

  constructor(init: ServiceWorkerContextInit<Event>) {
    this.event = init.event;
  }

  get response(): Response | undefined {
    return this.#response;
  }

  set response(response: Response) {
    this.#response = response;
  }

  abstract get body(): any | undefined;
  abstract set body(body: any);
}
