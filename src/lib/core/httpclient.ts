import {
  HttpClient as RawHttpClient,
  RequestURL as HttpClientRequestURL,
  RequestOptions,
} from 'urllib';
import { ms } from 'humanize-ms';
import type { EggApplicationCore } from '../egg.js';

export type {
  HttpClientResponse,
  RequestURL as HttpClientRequestURL,
} from 'urllib';

export interface HttpClientRequestOptions extends RequestOptions {
  ctx?: any;
  tracer?: any;
}

export class HttpClient extends RawHttpClient {
  readonly #app: EggApplicationCore & { tracer?: any };

  constructor(app: EggApplicationCore) {
    normalizeConfig(app);
    const config = app.config.httpclient;
    super({
      defaultArgs: config.request,
    });
    this.#app = app;
  }

  async request<T = any>(url: HttpClientRequestURL, options?: HttpClientRequestOptions) {
    options = options ?? {};
    if (options.ctx?.tracer) {
      options.tracer = options.ctx.tracer;
    } else {
      options.tracer = options.tracer ?? this.#app.tracer;
    }
    return await super.request<T>(url, options);
  }

  async curl<T = any>(url: HttpClientRequestURL, options?: HttpClientRequestOptions) {
    return await this.request<T>(url, options);
  }
}

// keep compatible
export type {
  HttpClient as EggHttpClient,
  HttpClient as EggContextHttpClient,
};

function normalizeConfig(app: EggApplicationCore) {
  const config = app.config.httpclient;
  if (typeof config.request?.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }
}
