import type { SecurityConfig, SecurityHelperConfig } from './config/config.default.ts';
import type { HttpClientRequestURL, HttpClientResponse, HttpClientOptions } from './lib/extend/safe_curl.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * security options
     * @member Config#security
     */
    security: SecurityConfig;
    helper: SecurityHelperConfig;
  }

  interface Agent {
    safeCurl<T = any>(url: HttpClientRequestURL, options?: HttpClientOptions): Promise<HttpClientResponse<T>>;
  }

  interface Application {
    injectCsrf(html: string): string;
    injectNonce(html: string): string;
    injectHijackingDefense(html: string): string;
    safeCurl<T = any>(url: HttpClientRequestURL, options?: HttpClientOptions): Promise<HttpClientResponse<T>>;
  }

  interface Context {
    get securityOptions(): Partial<SecurityConfig & SecurityHelperConfig>;
    isSafeDomain(domain: string, customWhiteList?: string[]): boolean;
    get nonce(): string;
    get csrf(): string;
    ensureCsrfSecret(rotate?: boolean): void;
    rotateCsrfSecret(): void;
    assertCsrf(): void;
    safeCurl<T = any>(url: HttpClientRequestURL, options?: HttpClientOptions): Promise<HttpClientResponse<T>>;
    unsafeRedirect(url: string, alt?: string): void;
  }

  interface Response {
    unsafeRedirect(url: string, alt?: string): void;
    redirect(url: string, alt?: string): void;
  }
}
