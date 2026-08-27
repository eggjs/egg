import type { Application, Context, ILifecycleBoot } from 'egg';
import type { Context as KoaContext } from 'koa';

export default class AppBoot implements ILifecycleBoot {
  #app: Application;

  constructor(app: Application) {
    this.#app = app;
  }

  configWillLoad(): void {
    const { config } = this.#app;
    config.coreMiddleware.unshift('cors');

    config.cors.hasCustomOriginHandler = Boolean(config.cors.origin);
    config.cors.origin ??= function corsOrigin(ctx: KoaContext): string {
      const origin = ctx.get('origin');
      if (!origin) return '';

      const eggContext = ctx as unknown as Context;
      if (typeof eggContext.isSafeDomain !== 'function') return origin;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(origin);
      } catch {
        return '';
      }

      if (eggContext.isSafeDomain(parsedUrl.hostname) || eggContext.isSafeDomain(origin)) {
        return origin;
      }
      return '';
    };
  }
}
