import type { Options as KoaCorsOptions } from '@koa/cors';

export interface CorsConfig extends KoaCorsOptions {
  /** Whether the application supplied its own origin handler. */
  hasCustomOriginHandler?: boolean;
}

export default {
  cors: {} as CorsConfig,
};
