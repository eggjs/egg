import { ms } from 'humanize-ms';
import {
  HttpClient as RawHttpClient,
  type RequestURL as HttpClientRequestURL,
  type RequestOptions,
  type ClientOptions as HttpClientOptions,
  type HttpClientResponse,
} from 'urllib';

import type { EggApplicationCore } from '../egg.ts';

export {
  type HttpClientResponse,
  type RequestURL as HttpClientRequestURL,
  type ClientOptions as HttpClientOptions,
} from 'urllib';

export interface HttpClientRequestOptions extends RequestOptions {
  ctx?: any;
  tracer?: any;
}

export class HttpClient extends RawHttpClient {
  readonly #app: EggApplicationCore & { tracer?: any };

  constructor(app: EggApplicationCore, options: HttpClientOptions = {}) {
    normalizeConfig(app);
    const config = app.config.httpclient || {};
    options.lookup = options.lookup ?? config.lookup;
    const initOptions: HttpClientOptions = {
      ...options,
      defaultArgs: {
        ...config.request,
        ...options.defaultArgs,
      },
    };
    super(initOptions);
    this.#app = app;

    // Apply custom interceptors via Dispatcher.compose() if configured.
    // This enables tracer injection, custom headers, retry logic, etc.
    if (config.interceptors?.length) {
      const originalDispatcher = this.getDispatcher();
      this.setDispatcher(originalDispatcher.compose(...config.interceptors));
    }
  }

  async request<T = any>(
    url: HttpClientRequestURL,
    options?: HttpClientRequestOptions,
  ): Promise<HttpClientResponse<T>> {
    options = options ?? {};
    if (options.ctx?.tracer) {
      options.tracer = options.ctx.tracer;
    } else {
      options.tracer = options.tracer ?? this.#app.tracer;
    }
    return await super.request<T>(url, options);
  }

  async curl<T = any>(url: HttpClientRequestURL, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return await this.request<T>(url, options);
  }
}

// keep compatible
export type { HttpClient as EggHttpClient, HttpClient as EggContextHttpClient };

function normalizeConfig(app: EggApplicationCore) {
  const config = app.config.httpclient;
  if (typeof config.request?.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }
}
