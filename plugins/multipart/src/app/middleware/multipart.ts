import { pathMatching } from 'egg-path-matching';
import type { Application, MiddlewareFunc } from 'egg';

import type { MultipartConfig } from '../../config/config.default.ts';

export default (options: MultipartConfig, _app: Application): MiddlewareFunc => {
  // normalize options
  const matchFn =
    options.fileModeMatch &&
    pathMatching({
      match: options.fileModeMatch,
      // pathToRegexpModule: app.options.pathToRegexpModule,
    });

  return async function multipart(ctx, next) {
    if (!ctx.is('multipart')) return next();
    if (matchFn && !matchFn(ctx)) return next();

    await ctx.saveRequestFiles();
    return next();
  };
};
