import { EggCoreContext } from '@eggjs/core';
import {
  HttpClient as RawHttpClient,
  RequestURL, RequestOptions,
} from 'urllib';
import ms from 'ms';
import type { EggApplication } from '../egg.js';

export type { HttpClientResponse } from 'urllib';
export type HttpClientRequestURL = RequestURL;

export interface HttpClientRequestOptions extends RequestOptions {
  ctx?: EggCoreContext;
  tracer?: unknown;
}

export class HttpClient extends RawHttpClient {
  readonly #app: EggApplication & { tracer?: unknown };

  constructor(app: EggApplication) {
    normalizeConfig(app);
    const config = app.config.httpclient;
    super({
      defaultArgs: config.request,
    });
    this.#app = app;
  }

  async request<T = any>(url: RequestURL, options?: HttpClientRequestOptions) {
    options = options ?? {};
    if (options.ctx?.tracer) {
      options.tracer = options.ctx.tracer;
    } else {
      options.tracer = options.tracer ?? this.#app.tracer;
    }
    return await super.request<T>(url, options);
  }

  async curl<T = any>(url: RequestURL, options?: HttpClientRequestOptions) {
    return await this.request<T>(url, options);
  }
}

function normalizeConfig(app: EggApplication) {
  const config = app.config.httpclient;
  if (typeof config.request.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }
}
