import { debuglog } from 'node:util';
import { parse as urlParse, type UrlWithStringQuery } from 'node:url';
import type { ParsedUrlQuery } from 'node:querystring';

import { Application, type MiddlewareFunc, type Context } from 'egg';

import { JSONP_CONFIG } from '../../lib/private_key.ts';
import type { JSONPConfig } from '../../config/config.default.ts';
import { JSONPForbiddenReferrerError } from '../../error/JSONPForbiddenReferrerError.ts';
import JSONPContext from './context.ts';

const debug = debuglog('egg/jsonp/app/extend/application');

export default class JSONPApplication extends Application {
  /**
   * return a middleware to enable jsonp response.
   * will do some security check inside.
   * @public
   */
  jsonp(initOptions: Partial<JSONPConfig> = {}): MiddlewareFunc {
    const options = {
      ...this.config.jsonp,
      ...initOptions,
    } as JSONPConfig & { callback: string[] };
    if (!Array.isArray(options.callback)) {
      options.callback = [options.callback];
    }

    const csrfEnable =
      this.plugins.security &&
      this.plugins.security.enable && // security enable
      this.config.security.csrf &&
      this.config.security.csrf.enable !== false && // csrf enable
      options.csrf; // jsonp csrf enabled

    const validateReferrer = options.whiteList && createValidateReferer(options.whiteList);

    if (!csrfEnable && !validateReferrer) {
      this.coreLogger.warn('[@eggjs/jsonp] SECURITY WARNING!! csrf check and referrer check are both closed!');
    }
    /**
     * jsonp request security check, pass if
     *
     * 1. hit referrer white list
     * 2. or pass csrf check
     * 3. both check are disabled
     *
     * @param {Context} ctx request context
     */
    function securityAssert(ctx: JSONPContext) {
      // all disabled. don't need check
      if (!csrfEnable && !validateReferrer) return;

      // pass referrer check
      const referrer = ctx.get<string>('referrer');
      if (validateReferrer && validateReferrer(referrer)) return;
      if (csrfEnable && validateCsrf(ctx)) return;

      throw new JSONPForbiddenReferrerError('jsonp request security validate failed', referrer, 403);
    }

    return async function jsonp(ctx: JSONPContext, next) {
      const jsonpFunction = getJsonpFunction(ctx.query, options.callback);

      ctx[JSONP_CONFIG] = {
        jsonpFunction,
        options,
      };

      // before handle request, must do some security checks
      securityAssert(ctx);

      await next();

      // generate jsonp body
      ctx.createJsonpBody(ctx.body);
    };
  }
}

function createValidateReferer(whiteList: Required<JSONPConfig>['whiteList']) {
  if (!Array.isArray(whiteList)) {
    whiteList = [whiteList];
  }

  return (referrer: string) => {
    let parsed: UrlWithStringQuery | undefined;
    for (const rule of whiteList) {
      if (rule instanceof RegExp) {
        if (rule.test(referrer)) {
          // regexp(/^https?:\/\/github.com\//): test the referrer with rule
          return true;
        }
        continue;
      }

      parsed = parsed ?? urlParse(referrer);
      const hostname = parsed.hostname || '';

      // check if referrer's hostname match the string rule
      if (rule[0] === '.' && (hostname.endsWith(rule) || hostname === rule.slice(1))) {
        // string start with `.`(.github.com): referrer's hostname must ends with rule
        return true;
      } else if (hostname === rule) {
        // string not start with `.`(github.com): referrer's hostname must strict equal to rule
        return true;
      }
    }

    // no rule matched
    return false;
  };
}

function validateCsrf(ctx: Context) {
  try {
    ctx.assertCsrf();
    return true;
  } catch (err) {
    debug('validate csrf failed: %s', err);
    return false;
  }
}

function getJsonpFunction(query: ParsedUrlQuery, callbacks: string[]) {
  for (const callback of callbacks) {
    if (query[callback]) {
      return query[callback] as string;
    }
  }
}
