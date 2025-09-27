import extend from 'extend';
import type { Context, Next } from '@eggjs/core';
import { checkIfIgnore } from '../utils.js';
import type { SecurityConfig } from '../../types.js';

const HEADER = ['x-content-security-policy', 'content-security-policy'];
const REPORT_ONLY_HEADER = ['x-content-security-policy-report-only', 'content-security-policy-report-only'];

// Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)
const MSIE_REGEXP = / MSIE /i;

export default (options: SecurityConfig['csp']) => {
  return async function csp(ctx: Context, next: Next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.csp,
    };
    if (checkIfIgnore(opts, ctx)) return;

    let finalHeader;
    const matchedOption = extend(true, {}, opts.policy);
    const bufArray = [];

    const headers = opts.reportOnly ? REPORT_ONLY_HEADER : HEADER;
    if (opts.supportIE && MSIE_REGEXP.test(ctx.get('user-agent'))) {
      finalHeader = headers[0];
    } else {
      finalHeader = headers[1];
    }

    for (const key in matchedOption) {
      const value = matchedOption[key];
      // Other arrays are splitted into strings EXCEPT `sandbox`
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/sandbox
      if (key === 'sandbox' && value === true) {
        bufArray.push(key);
      } else {
        let values = (Array.isArray(value) ? value : [value]) as string[];
        if (key === 'script-src') {
          const hasNonce = values.some(function (val) {
            return val.indexOf('nonce-') !== -1;
          });

          if (!hasNonce) {
            values.push("'nonce-" + ctx.nonce + "'");
          }
        }

        values = values.map(function (d) {
          if (d.startsWith('.')) {
            d = '*' + d;
          }
          return d;
        });
        bufArray.push(key + ' ' + values.join(' '));
      }
    }
    const headerString = bufArray.join(';');
    ctx.set(finalHeader, headerString);
    ctx.set('x-csp-nonce', ctx.nonce);
  };
};
