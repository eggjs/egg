import { EggCore } from '@eggjs/core';
import {
  safeCurlForApplication,
  type HttpClientRequestURL,
  type HttpClientOptions,
  type HttpClientResponse,
} from '../../lib/extend/safe_curl.js';

export default class SecurityAgent extends EggCore {
  async safeCurl<T = any>(url: HttpClientRequestURL, options?: HttpClientOptions): Promise<HttpClientResponse<T>> {
    return await safeCurlForApplication<T>(this, url, options);
  }
}
