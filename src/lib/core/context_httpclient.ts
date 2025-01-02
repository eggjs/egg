import type { Context, EggApplicationCore } from '../egg.js';
import type {
  HttpClientRequestURL, HttpClientRequestOptions,
} from './httpclient.js';

export class ContextHttpClient {
  ctx: Context;
  app: EggApplicationCore;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.app = ctx.app;
  }

  /**
   * http request helper base on {@link HttpClient}, it will auto save httpclient log.
   * Keep the same api with {@link Application#curl}.
   *
   * @param {String|Object} url - request url address.
   * @param {Object} [options] - options for request.
   */
  async curl<T = any>(url: HttpClientRequestURL, options?: HttpClientRequestOptions) {
    options = {
      ...options,
      ctx: this.ctx,
    };
    return await this.app.curl<T>(url, options);
  }

  async request<T = any>(url: HttpClientRequestURL, options?: HttpClientRequestOptions) {
    return await this.curl<T>(url, options);
  }
}
