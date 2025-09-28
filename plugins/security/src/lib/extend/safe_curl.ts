import type { EggApplicationCore } from 'egg';

import type { SSRFCheckAddressFunction } from '../../config/config.default.ts';

const SSRF_HTTPCLIENT = Symbol('SSRF_HTTPCLIENT');

type HttpClient = EggApplicationCore['HttpClient'];
type HttpClientParameters = Parameters<HttpClient['prototype']['request']>;
export type HttpClientRequestURL = HttpClientParameters[0];
export type HttpClientOptions = HttpClientParameters[1] & { checkAddress?: SSRFCheckAddressFunction };
export type HttpClientResponse<T = any> = Awaited<ReturnType<HttpClient['prototype']['request']>> & { data: T };

/**
 * safe curl with ssrf protection
 */
export async function safeCurlForApplication<T = any>(
  app: EggApplicationCore,
  url: HttpClientRequestURL,
  options: HttpClientOptions = {}
) {
  const ssrfConfig = app.config.security.ssrf;
  if (ssrfConfig?.checkAddress) {
    options.checkAddress = ssrfConfig.checkAddress;
  } else {
    app.logger.warn('[@eggjs/security] please configure `config.security.ssrf` first');
  }

  if (ssrfConfig?.checkAddress) {
    let httpClient = app[SSRF_HTTPCLIENT] as ReturnType<EggApplicationCore['createHttpClient']>;
    // use the new httpClient init with checkAddress
    if (!httpClient) {
      httpClient = app[SSRF_HTTPCLIENT] = app.createHttpClient({
        checkAddress: ssrfConfig.checkAddress,
      });
    }
    return await httpClient.request<T>(url, options);
  }

  return await app.curl<T>(url, options);
}
