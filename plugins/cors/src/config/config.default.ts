import type { Context, PartialEggConfig } from 'egg';

export interface CorsConfig {
  /**
   * `Access-Control-Allow-Origin`, default to the request `Origin` header.
   *
   * When the `security` plugin is enabled and no custom `origin` is provided,
   * only safe domains are allowed.
   */
  origin?: string | ((ctx: Context) => string | PromiseLike<string>);
  /**
   * `Access-Control-Allow-Methods`
   */
  allowMethods?: string | string[];
  /**
   * `Access-Control-Expose-Headers`
   */
  exposeHeaders?: string | string[];
  /**
   * `Access-Control-Allow-Headers`
   */
  allowHeaders?: string | string[];
  /**
   * `Access-Control-Max-Age` in seconds
   */
  maxAge?: string | number;
  /**
   * `Access-Control-Allow-Credentials`
   */
  credentials?: boolean | ((ctx: Context) => boolean | PromiseLike<boolean>);
  /**
   * Add CORS headers to error responses as well
   */
  keepHeadersOnError?: boolean;
  /**
   * `Access-Control-Allow-Private-Network`
   */
  privateNetworkAccess?: boolean;
  /**
   * Set to `true` to add `Cross-Origin-Opener-Policy` and
   * `Cross-Origin-Embedder-Policy` headers
   */
  secureContext?: boolean;
  /**
   * Set to `true` to skip `Access-Control-Allow-Origin` when the request has
   * no `Origin` header
   */
  allowAllOrigins?: boolean;
  /**
   * Whether the user supplied a custom `origin` handler.
   *
   * Filled in automatically by the plugin, do not set this manually.
   * @private
   */
  hasCustomOriginHandler?: boolean;
}

const config: PartialEggConfig = {
  cors: {},
};

export default config;
