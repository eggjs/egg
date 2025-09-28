import { pathMatching } from 'egg-path-matching';
import type { Context, Next, EggCore } from '@eggjs/core';
import type { MultipartConfig } from '../../config/config.default.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (options: MultipartConfig, _app: EggCore) => {
  // normalize options
  const matchFn =
    options.fileModeMatch &&
    pathMatching({
      match: options.fileModeMatch,
      // pathToRegexpModule: app.options.pathToRegexpModule,
    });

  return async function multipart(ctx: Context, next: Next) {
    if (!ctx.is('multipart')) return next();
    if (matchFn && !matchFn(ctx)) return next();

    await ctx.saveRequestFiles();
    return next();
  };
};
