import type { Application, Context, ILifecycleBoot } from 'egg';

export default class AppBoot implements ILifecycleBoot {
  private readonly app;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad(): void {
    const app = this.app;
    // put before other core middlewares
    app.config.coreMiddleware.unshift('cors');

    const corsConfig = app.config.cors;
    if (!corsConfig) return;

    // if the security plugin is enabled and no `origin` config is provided,
    // only safe domains are allowed to support CORS.
    corsConfig.hasCustomOriginHandler = !!corsConfig.origin;
    if (corsConfig.origin) return;

    corsConfig.origin = function corsOrigin(ctx: Context) {
      // origin is {protocol}{hostname}{port}...
      // `ctx.get()` may return `string[]` for repeated headers
      const rawOrigin = ctx.get('origin');
      const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
      if (!origin) return '';

      if (typeof ctx.isSafeDomain !== 'function') return origin;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(origin);
      } catch {
        return '';
      }

      if (ctx.isSafeDomain(parsedUrl.hostname) || ctx.isSafeDomain(origin)) {
        return origin;
      }
      return '';
    };
  }
}
