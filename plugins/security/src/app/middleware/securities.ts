import assert from 'node:assert';
import compose from 'koa-compose';
import { pathMatching } from 'egg-path-matching';
import type { EggCore, MiddlewareFunc } from '@eggjs/core';
import securityMiddlewares from '../../lib/middlewares/index.js';
import type { SecurityMiddlewareName } from '../../config/config.default.js';

export default (_: unknown, app: EggCore) => {
  const options = app.config.security;
  const middlewares: MiddlewareFunc[] = [];
  const defaultMiddlewares =
    typeof options.defaultMiddleware === 'string'
      ? (options.defaultMiddleware
          .split(',')
          .map(m => m.trim())
          .filter(m => !!m) as SecurityMiddlewareName[])
      : options.defaultMiddleware;

  if (options.match || options.ignore) {
    app.coreLogger.warn('[@eggjs/security/middleware/securities] Please set `match` or `ignore` on sub config');
  }

  // format csrf.cookieDomain
  const originalCookieDomain = options.csrf.cookieDomain;
  if (originalCookieDomain && typeof originalCookieDomain !== 'function') {
    options.csrf.cookieDomain = () => originalCookieDomain;
  }

  defaultMiddlewares.forEach(middlewareName => {
    const opt = Reflect.get(options, middlewareName) as any;
    if (opt === false) {
      app.coreLogger.warn(
        '[egg-security] Please use `config.security.%s = { enable: false }` instead of `config.security.%s = false`',
        middlewareName,
        middlewareName
      );
    }

    assert(
      opt === false || typeof opt === 'object',
      `config.security.${middlewareName} must be an object, or false(if you turn it off)`
    );

    if (opt === false || (opt && opt.enable === false)) {
      return;
    }

    if (middlewareName === 'csrf' && opt.useSession && !app.plugins.session) {
      throw new Error('csrf.useSession enabled, but session plugin is disabled');
    }

    // use opt.match first (compatibility)
    if (opt.match && opt.ignore) {
      app.coreLogger.warn(
        '[@eggjs/security/middleware/securities] `options.match` and `options.ignore` are both set, using `options.match`'
      );
      opt.ignore = undefined;
    }
    if (!opt.ignore && opt.blackUrls) {
      app.deprecate(
        '[@eggjs/security/middleware/securities] Please use `config.security.xframe.ignore` instead, `config.security.xframe.blackUrls` will be removed very soon'
      );
      opt.ignore = opt.blackUrls;
    }
    // set matching function to security middleware options
    opt.matching = pathMatching(opt);

    const createMiddleware = securityMiddlewares[middlewareName];
    const fn = createMiddleware(opt);
    middlewares.push(fn);
    app.coreLogger.info('[@eggjs/security/middleware/securities] use %s middleware', middlewareName);
  });

  app.coreLogger.info(
    '[@eggjs/security/middleware/securities] compose %d middlewares into one security middleware',
    middlewares.length
  );
  return compose(middlewares);
};
