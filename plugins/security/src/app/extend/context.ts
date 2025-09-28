import { debuglog } from 'node:util';

import { nanoid } from 'nanoid/non-secure';
import Tokens from 'csrf';
import { Context } from 'egg';

import * as utils from '../../lib/utils.ts';
import type { HttpClientRequestURL, HttpClientOptions, HttpClientResponse } from '../../lib/extend/safe_curl.ts';
import type { SecurityConfig } from '../../config/config.default.ts';
import type SecurityResponse from './response.ts';

const debug = debuglog('egg/security/app/extend/context');

const tokens = new Tokens();

const CSRF_SECRET = Symbol('egg-security#CSRF_SECRET');
const _CSRF_SECRET = Symbol('egg-security#_CSRF_SECRET');
const NEW_CSRF_SECRET = Symbol('egg-security#NEW_CSRF_SECRET');
const LOG_CSRF_NOTICE = Symbol('egg-security#LOG_CSRF_NOTICE');
const INPUT_TOKEN = Symbol('egg-security#INPUT_TOKEN');
const NONCE_CACHE = Symbol('egg-security#NONCE_CACHE');
const SECURITY_OPTIONS = Symbol('egg-security#SECURITY_OPTIONS');
const CSRF_REFERER_CHECK = Symbol('egg-security#CSRF_REFERER_CHECK');
const CSRF_CTOKEN_CHECK = Symbol('egg-security#CSRF_CTOKEN_CHECK');

function findToken(obj: Record<string, string>, keys: string | string[]) {
  if (!obj) return;
  if (!keys || !keys.length) return;
  if (typeof keys === 'string') return obj[keys];
  for (const key of keys) {
    if (obj[key]) return obj[key];
  }
}

export default class SecurityContext extends Context {
  declare response: SecurityResponse;

  get securityOptions() {
    if (!this[SECURITY_OPTIONS]) {
      this[SECURITY_OPTIONS] = {};
    }
    return this[SECURITY_OPTIONS] as Partial<SecurityConfig>;
  }

  /**
   * Check whether the specific `domain` is in / matches the whiteList or not.
   * @param {string} domain The assigned domain.
   * @param {Array<string>} [customWhiteList] The custom white list for domain.
   * @return {boolean} If the domain is in / matches the whiteList, return true;
   * otherwise false.
   */
  isSafeDomain(domain: string, customWhiteList?: string[]): boolean {
    const domainWhiteList =
      customWhiteList && customWhiteList.length > 0 ? customWhiteList : this.app.config.security.domainWhiteList;
    return utils.isSafeDomain(domain, domainWhiteList);
  }

  // Add nonce, random characters will be OK.
  // https://w3c.github.io/webappsec/specs/content-security-policy/#nonce_source
  get nonce(): string {
    if (!this[NONCE_CACHE]) {
      this[NONCE_CACHE] = nanoid(16);
    }
    return this[NONCE_CACHE] as string;
  }

  /**
   * get csrf token, general use in template
   * @return {String} csrf token
   * @public
   */
  get csrf(): string {
    // csrfSecret can be rotate, use NEW_CSRF_SECRET first
    const secret = this[NEW_CSRF_SECRET] || this[CSRF_SECRET];
    debug('get csrf token, NEW_CSRF_SECRET: %s, _CSRF_SECRET: %s', this[NEW_CSRF_SECRET], this[CSRF_SECRET]);
    //  In order to protect against BREACH attacks,
    //  the token is not simply the secret;
    //  a random salt is prepended to the secret and used to scramble it.
    //  http://breachattack.com/
    return secret ? tokens.create(secret as string) : '';
  }

  /**
   * get csrf secret from session or cookie
   * @return {String} csrf secret
   * @private
   */
  get [CSRF_SECRET](): string {
    if (this[_CSRF_SECRET]) {
      return this[_CSRF_SECRET] as string;
    }
    let { useSession, sessionName, cookieName: cookieNames, cookieOptions } = this.app.config.security.csrf;
    // get secret from session or cookie
    if (useSession) {
      this[_CSRF_SECRET] = (this.session as any)[sessionName] || '';
    } else {
      // cookieName support array. so we can change csrf cookie name smoothly
      if (!Array.isArray(cookieNames)) {
        cookieNames = [cookieNames];
      }
      for (const cookieName of cookieNames) {
        this[_CSRF_SECRET] = this.cookies.get(cookieName, { signed: cookieOptions.signed }) || '';
        if (this[_CSRF_SECRET]) {
          break;
        }
      }
    }
    return this[_CSRF_SECRET] as string;
  }

  /**
   * ensure csrf secret exists in session or cookie.
   * @param {Boolean} [rotate] reset secret even if the secret exists
   * @public
   */
  ensureCsrfSecret(rotate?: boolean) {
    if (this[CSRF_SECRET] && !rotate) return;
    debug('ensure csrf secret, exists: %s, rotate; %s', this[CSRF_SECRET], rotate);
    const secret = tokens.secretSync();
    this[NEW_CSRF_SECRET] = secret;
    let {
      useSession,
      sessionName,
      cookieDomain,
      cookieName: cookieNames,
      cookieOptions,
    } = this.app.config.security.csrf;

    if (useSession) {
      // TODO(fengmk2): need to refactor egg-session plugin to support ctx.session type define
      (this.session as any)[sessionName] = secret;
    } else {
      if (typeof cookieDomain === 'function') {
        cookieDomain = cookieDomain(this);
      }
      const cookieOpts = {
        domain: cookieDomain,
        ...cookieOptions,
      };
      // cookieName support array. so we can change csrf cookie name smoothly
      if (!Array.isArray(cookieNames)) {
        cookieNames = [cookieNames];
      }
      for (const cookieName of cookieNames) {
        this.cookies.set(cookieName, secret, cookieOpts);
      }
    }
  }

  get [INPUT_TOKEN]() {
    const { headerName, bodyName, queryName } = this.app.config.security.csrf;
    // try order: query, body, header
    const token =
      findToken(this.request.query, queryName) ||
      findToken(this.request.body, bodyName) ||
      (headerName && this.request.get<string>(headerName));
    debug('get token: %j, secret: %j', token, this[CSRF_SECRET]);
    return token;
  }

  /**
   * rotate csrf secret exists in session or cookie.
   * must rotate the secret when user login
   * @public
   */
  rotateCsrfSecret() {
    if (!this[NEW_CSRF_SECRET] && this[CSRF_SECRET]) {
      this.ensureCsrfSecret(true);
    }
  }

  /**
   * assert csrf token/referer is present
   * @public
   */
  assertCsrf() {
    if (utils.checkIfIgnore(this.app.config.security.csrf, this)) {
      debug('%s, ignore by csrf options', this.path);
      return;
    }

    const { type } = this.app.config.security.csrf;
    let message;
    const messages = [];
    switch (type) {
      case 'ctoken':
        message = this[CSRF_CTOKEN_CHECK]();
        if (message) this.throw(403, message);
        break;
      case 'referer':
        message = this[CSRF_REFERER_CHECK]();
        if (message) this.throw(403, message);
        break;
      case 'all':
        message = this[CSRF_CTOKEN_CHECK]();
        if (message) this.throw(403, message);
        message = this[CSRF_REFERER_CHECK]();
        if (message) this.throw(403, message);
        break;
      case 'any':
        message = this[CSRF_CTOKEN_CHECK]();
        if (!message) return;
        messages.push(message);
        message = this[CSRF_REFERER_CHECK]();
        if (!message) return;
        messages.push(message);
        this.throw(403, `both ctoken and referer check error: ${messages.join(', ')}`);
        break;
      default:
        this.throw(`invalid type ${type}`);
    }
  }

  [CSRF_CTOKEN_CHECK]() {
    if (!this[CSRF_SECRET]) {
      debug('missing csrf token');
      this[LOG_CSRF_NOTICE]('missing csrf token');
      return 'missing csrf token';
    }
    const token = this[INPUT_TOKEN];
    // AJAX requests get csrf token from cookie, in this situation token will equal to secret
    // synchronize form requests' token always changing to protect against BREACH attacks
    if (token !== this[CSRF_SECRET] && !tokens.verify(this[CSRF_SECRET], token)) {
      debug('verify secret and token error');
      this[LOG_CSRF_NOTICE]('invalid csrf token');
      const { rotateWhenInvalid } = this.app.config.security.csrf;
      if (rotateWhenInvalid) {
        this.rotateCsrfSecret();
      }
      return 'invalid csrf token';
    }
  }

  [CSRF_REFERER_CHECK]() {
    const { refererWhiteList } = this.app.config.security.csrf;
    // check Origin/Referer headers
    const referer = (this.headers.referer ?? this.headers.origin ?? '').toLowerCase();

    if (!referer) {
      debug('missing csrf referer or origin');
      this[LOG_CSRF_NOTICE]('missing csrf referer or origin');
      return 'missing csrf referer or origin';
    }

    const host = utils.getFromUrl(referer, 'host');
    const domainList = refererWhiteList.concat(this.host);
    if (!host || !utils.isSafeDomain(host, domainList)) {
      debug('verify referer or origin error');
      this[LOG_CSRF_NOTICE]('invalid csrf referer or origin');
      return 'invalid csrf referer or origin';
    }
  }

  [LOG_CSRF_NOTICE](msg: string) {
    if (this.app.config.env === 'local') {
      this.logger.warn(
        `${msg}. See https://eggjs.org/zh-CN/core/security/#%E5%AE%89%E5%85%A8%E5%A8%81%E8%83%81-csrf-%E7%9A%84%E9%98%B2%E8%8C%83`
      );
    }
  }

  async safeCurl<T = any>(url: HttpClientRequestURL, options?: HttpClientOptions): Promise<HttpClientResponse<T>> {
    return await this.app.safeCurl<T>(url, options);
  }

  unsafeRedirect(url: string, alt?: string) {
    this.response.unsafeRedirect(url, alt);
  }
}
