import assert from 'node:assert';
import { mkdirSync, existsSync } from 'node:fs';

import range from 'koa-range';
import compose from 'koa-compose';
import type { Application, Context, Next } from 'egg';
import { staticCache } from '@eggjs/koa-static-cache';
import { LRU } from 'ylru';

import type { StaticConfig, StaticDirOptions } from '../../types.ts';

export default (options: StaticConfig, app: Application) => {
  const dirs = (options.dirs ?? []).concat(options.dir);

  const prefixes: string[] = [];

  function rangeMiddleware(ctx: Context, next: Next) {
    // if match static file, and use range middleware.
    const isMatch = prefixes.some(p => ctx.path.startsWith(p));
    if (isMatch) {
      return range(ctx as any, next);
    }
    return next();
  }

  const middlewares = [rangeMiddleware];

  for (const dirObj of dirs) {
    const isObject = typeof dirObj === 'object' && dirObj !== null;
    const isString = typeof dirObj === 'string';
    assert(isObject || isString, '`config.static.dir` must be `string | Array<string|object>`');

    let newOptions: StaticDirOptions;
    if (isString) {
      // copy origin options to new options ensure the safety of objects
      newOptions = {
        ...options,
        dir: dirObj,
      };
    } else {
      assert(
        typeof dirObj.dir === 'string',
        '`config.static.dirs` should contains `[].dir` property when object style'
      );
      newOptions = {
        ...options,
        ...dirObj,
      };
    }

    if (newOptions.dynamic && !newOptions.files) {
      newOptions.files = new LRU(newOptions.maxFiles);
    }

    if (newOptions.prefix) {
      prefixes.push(newOptions.prefix);
    }

    // ensure directory exists
    if (!existsSync(newOptions.dir)) {
      mkdirSync(newOptions.dir, { recursive: true });
    }
    middlewares.push(staticCache(newOptions));

    app.coreLogger.info('[@eggjs/static] starting static serve %s -> %s', newOptions.prefix, newOptions.dir);
  }

  return compose(middlewares);
};
