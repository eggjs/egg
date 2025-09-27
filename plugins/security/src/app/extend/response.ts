import { Response as KoaResponse } from '@eggjs/core';
import SecurityContext from './context.js';

const unsafeRedirect = KoaResponse.prototype.redirect;

export default class SecurityResponse extends KoaResponse {
  declare ctx: SecurityContext;

  /**
   * This is an unsafe redirection, and we WON'T check if the
   * destination url is safe or not.
   * Please DO NOT use this method unless in some very special cases,
   * otherwise there may be security vulnerabilities.
   *
   * @function Response#unsafeRedirect
   * @param {String} url URL to forward
   * @example
   * ```js
   * ctx.response.unsafeRedirect('http://www.domain.com');
   * ctx.unsafeRedirect('http://www.domain.com');
   * ```
   */
  unsafeRedirect(url: string, alt?: string) {
    unsafeRedirect.call(this, url, alt);
  }

  // app.response.unsafeRedirect = app.response.redirect;
  // delegate(app.context, 'response').method('unsafeRedirect');
  /**
   * A safe redirection, and we'll check if the URL is in
   * a safe domain or not.
   * We've overridden the default Koa's implementation by adding a
   * white list as the filter for that.
   *
   * @function Response#redirect
   * @param {String} url URL to forward
   * @example
   * ```js
   * ctx.response.redirect('/login');
   * ctx.redirect('/login');
   * ```
   */
  redirect(url: string, alt?: string) {
    url = (url || '/').trim();

    // Process with `//`
    if (url[0] === '/' && url[1] === '/') {
      url = '/';
    }

    // if begin with '/', it means an internal jump
    if (url[0] === '/' && url[1] !== '\\') {
      this.unsafeRedirect(url, alt);
      return;
    }

    let urlObject: URL;
    try {
      urlObject = new URL(url);
    } catch {
      url = '/';
      this.unsafeRedirect(url);
      return;
    }

    const domainWhiteList = this.app.config.security.domainWhiteList;
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      url = '/';
    } else if (!urlObject.hostname) {
      url = '/';
    } else {
      if (domainWhiteList && domainWhiteList.length !== 0) {
        if (!this.ctx.isSafeDomain(urlObject.hostname)) {
          const message = `a security problem has been detected for url "${url}", redirection is prohibited.`;
          if (process.env.NODE_ENV === 'production') {
            this.app.coreLogger.warn('[@eggjs/security/response/redirect] %s', message);
            url = '/';
          } else {
            // Exception will be thrown out in a non-PROD env.
            return this.ctx.throw(500, message);
          }
        }
      }
    }
    this.unsafeRedirect(url);
  }
}

declare module '@eggjs/core' {
  // add Response overrides types
  interface Response {
    unsafeRedirect(url: string, alt?: string): void;
    redirect(url: string, alt?: string): void;
  }
}
