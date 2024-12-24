import type {
  Router,
} from '@eggjs/core';
import type {
  HttpClientRequestURL, HttpClientRequestOptions, HttpClient,
} from '../../lib/core/httpclient.js';
import type {
  ContextHttpClient,
} from '../../lib/core/context_httpclient.js';
import type Helper from './helper.js';
import type { EggLogger } from 'egg-logger';

declare module '@eggjs/core' {
  // add Context overrides types
  interface Context {
    curl(url: HttpClientRequestURL, options?: HttpClientRequestOptions): ReturnType<HttpClient['request']>;
    get router(): Router;
    set router(val: Router);
    get helper(): Helper;
    get httpclient(): ContextHttpClient;
    get httpClient(): ContextHttpClient;
    getLogger(name: string): EggLogger;
  }
}
