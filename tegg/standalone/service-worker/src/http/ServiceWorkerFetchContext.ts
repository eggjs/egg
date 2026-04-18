import { FetchEvent, ServiceWorkerContextInit } from '@eggjs/tegg-types/standalone';
import { BaseServiceWorkerContextImpl } from '../controller/ServiceWorkerContext.ts';
import { ResponseUtils } from '../utils/ResponseUtils.ts';

export class ServiceWorkerFetchContext extends BaseServiceWorkerContextImpl<FetchEvent, Response> {
  url: URL;
  method: string;
  path: string;
  host: string;
  // params will be set in @eggjs/router
  params: Record<string, string> = {};
  #body?: any;

  constructor(init: ServiceWorkerContextInit<FetchEvent>) {
    super(init);

    this.url = new URL(this.event.request.url);
    this.method = this.event.request.method;
    this.path = this.url.pathname;
    this.host = this.url.hostname;
  }

  get response(): Response | undefined {
    return super.response;
  }

  set response(response: Response) {
    super.response = response;
    this.#body = response.body;
  }

  get body(): any | undefined {
    return this.#body;
  }

  set body(body: any) {
    this.response = ResponseUtils.createResponseByBody(body);
    this.#body = body;
  }
}
