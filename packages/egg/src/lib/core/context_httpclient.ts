import type { Context } from "../egg.ts";
import type { Application } from "../application.ts";
import type {
  HttpClientRequestURL,
  HttpClientRequestOptions,
  HttpClientResponse,
} from "./httpclient.ts";

export class ContextHttpClient {
  ctx: Context;
  app: Application;

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
  async curl<T = any>(
    url: HttpClientRequestURL,
    options?: HttpClientRequestOptions,
  ): Promise<HttpClientResponse<T>> {
    options = {
      ...options,
      ctx: this.ctx,
    };
    return await this.app.curl<T>(url, options);
  }

  async request<T = any>(
    url: HttpClientRequestURL,
    options?: HttpClientRequestOptions,
  ): Promise<HttpClientResponse<T>> {
    return await this.curl<T>(url, options);
  }
}
