import { Agent } from 'egg';

import {
  safeCurlForApplication,
  type HttpClientRequestURL,
  type HttpClientOptions,
  type HttpClientResponse,
} from '../../lib/extend/safe_curl.ts';

export default class SecurityAgent extends Agent {
  async safeCurl<T = any>(url: HttpClientRequestURL, options?: HttpClientOptions): Promise<HttpClientResponse<T>> {
    return await safeCurlForApplication<T>(this, url, options);
  }
}
