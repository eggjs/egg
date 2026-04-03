import { ms } from 'humanize-ms';
import {
  HttpClient as RawHttpClient,
  HttpClientRequestTimeoutError,
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
    // Bun's undici doesn't honor headersTimeout/bodyTimeout,
    // use AbortSignal.timeout as a fallback to enforce request timeout
    if (process.versions.bun && !options.signal) {
      const rawTimeout = options.timeout ?? this.#app.config.httpclient?.request?.timeout;
      // urllib supports timeout as number or [connectTimeout, responseTimeout].
      // Use the shorter (connect) timeout for AbortSignal — if headers haven't
      // arrived within connectTimeout the request should fail, matching Node's
      // headersTimeout semantics as closely as possible.
      const timeoutMs = Array.isArray(rawTimeout)
        ? Math.min(...rawTimeout.filter((t): t is number => typeof t === 'number' && t > 0))
        : rawTimeout;
      if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        options.signal = AbortSignal.timeout(timeoutMs);
        try {
          return await super.request<T>(url, options);
        } catch (err: any) {
          if (err?.name === 'TimeoutError' || err?.code === 'ABORT_ERR') {
            throw new HttpClientRequestTimeoutError(timeoutMs, { cause: err });
          }
          throw err;
        }
      }
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
