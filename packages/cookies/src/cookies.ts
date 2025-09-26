import assert from 'node:assert';

import { base64decode, base64encode } from 'utility';
import { isSameSiteNoneCompatible } from 'should-send-same-site-none';

import { Keygrip } from './keygrip.ts';
import { Cookie, type CookieSetOptions } from './cookie.ts';
import { CookieError } from './error.ts';

const keyCache = new Map<string[], Keygrip>();

export interface DefaultCookieOptions extends CookieSetOptions {
  /**
   * Auto get and set `_CHIPS-` prefix cookie to adaptation CHIPS mode (The default value is false).
   */
  autoChips?: boolean;
}

export interface CookieGetOptions {
  /**
   * Whether to sign or not (The default value is true).
   */
  signed?: boolean;
  /**
   * Encrypt the cookie's value or not (The default value is false).
   */
  encrypt?: boolean;
}

/**
 * cookies for egg
 * extend pillarjs/cookies, add encrypt and decrypt
 */
export class Cookies {
  readonly #keysArray: string[];
  #keys: Keygrip;
  readonly #defaultCookieOptions?: DefaultCookieOptions;
  readonly #autoChips?: boolean;
  readonly ctx: Record<string, any>;
  readonly app: Record<string, any>;
  readonly secure: boolean;
  #parseChromiumResult?: ParseChromiumResult;

  constructor(ctx: Record<string, any>, keys: string[], defaultCookieOptions?: DefaultCookieOptions) {
    this.#keysArray = keys;
    // default cookie options
    this.#defaultCookieOptions = defaultCookieOptions;
    this.#autoChips = defaultCookieOptions?.autoChips;
    this.ctx = ctx;
    this.secure = this.ctx.secure;
    this.app = ctx.app;
  }

  get keys() {
    if (!this.#keys) {
      assert(Array.isArray(this.#keysArray), '.keys required for encrypt/sign cookies');
      const cache = keyCache.get(this.#keysArray);
      if (cache) {
        this.#keys = cache;
      } else {
        this.#keys = new Keygrip(this.#keysArray);
        keyCache.set(this.#keysArray, this.#keys);
      }
    }
    return this.#keys;
  }

  /**
   * get cookie value by name
   * @param  {String} name - cookie's name
   * @param  {Object} opts - cookies' options
   *            - {Boolean} signed - default to true
   *            - {Boolean} encrypt - default to false
   * @return {String} value - cookie's value
   */
  get(name: string, opts: CookieGetOptions = {}): string | undefined {
    let value = this._get(name, opts);
    if (value === undefined && this.#autoChips) {
      // try to read _CHIPS-${name} prefix cookie
      value = this._get(this.#formatChipsCookieName(name), opts);
    }
    return value;
  }

  _get(name: string, opts: CookieGetOptions) {
    const signed = computeSigned(opts);
    const header: string = this.ctx.get('cookie');
    if (!header) return;

    const match = header.match(getPattern(name));
    if (!match) return;

    let value = match[1];
    if (!opts.encrypt && !signed) return value;

    // signed
    if (signed) {
      const sigName = name + '.sig';
      const sigValue = this.get(sigName, { signed: false });
      if (!sigValue) return;

      const raw = name + '=' + value;
      const index = this.keys.verify(raw, sigValue);
      if (index < 0) {
        // can not match any key, remove ${name}.sig
        this.set(sigName, null, { path: '/', signed: false, overwrite: true });
        return;
      }
      if (index > 0) {
        // not signed by the first key, update sigValue
        this.set(sigName, this.keys.sign(raw), { signed: false, overwrite: true });
      }
      return value;
    }

    // encrypt
    value = base64decode(value, true, 'buffer') as string;
    const res = this.keys.decrypt(value);
    return res ? res.value.toString() : undefined;
  }

  set(name: string, value: string | null, opts?: CookieSetOptions) {
    opts = {
      ...this.#defaultCookieOptions,
      ...opts,
    };
    const signed = computeSigned(opts);
    const shouldIgnoreSecureError = opts && opts.ignoreSecureError;
    value = value || '';
    if (!shouldIgnoreSecureError) {
      if (!this.secure && opts.secure) {
        throw new CookieError('Cannot send secure cookie over unencrypted connection');
      }
    }

    let headers: string[] = this.ctx.response.get('set-cookie') || [];
    if (!Array.isArray(headers)) {
      headers = [headers];
    }

    // encrypt
    if (opts.encrypt) {
      value = value && base64encode(this.keys.encrypt(value), true);
    }

    // http://browsercookielimits.squawky.net/
    if (value.length > 4093) {
      this.app.emit('cookieLimitExceed', { name, value, ctx: this.ctx });
    }

    // https://github.com/linsight/should-send-same-site-none
    // fixed SameSite=None: Known Incompatible Clients
    const userAgent: string | undefined = this.ctx.get('user-agent');
    let isSameSiteNone = false;
    // disable autoChips if partitioned enable
    let autoChips = !opts.partitioned && this.#autoChips;
    if (opts.sameSite && typeof opts.sameSite === 'string' && opts.sameSite.toLowerCase() === 'none') {
      isSameSiteNone = true;
      if (opts.secure === false || !this.secure || (userAgent && !this.isSameSiteNoneCompatible(userAgent))) {
        // Non-secure context or Incompatible clients, don't send SameSite=None property
        opts.sameSite = false;
        isSameSiteNone = false;
      }
    }
    if (autoChips || opts.partitioned) {
      // allow to set partitioned: secure=true and sameSite=none and chrome >= 118
      if (
        !isSameSiteNone ||
        opts.secure === false ||
        !this.secure ||
        (userAgent && !this.isPartitionedCompatible(userAgent))
      ) {
        // Non-secure context or Incompatible clients, don't send partitioned property
        autoChips = false;
        opts.partitioned = false;
      }
    }

    // remove unpartitioned same name cookie first
    if (opts.partitioned && opts.removeUnpartitioned) {
      const overwrite = opts.overwrite;
      if (overwrite) {
        opts.overwrite = false;
        headers = ignoreCookiesByName(headers, name);
      }
      const removeCookieOpts = {
        ...opts,
        partitioned: false,
      };
      const removeUnpartitionedCookie = new Cookie(name, '', removeCookieOpts);
      // if user not set secure, reset secure to ctx.secure
      if (opts.secure === undefined) {
        removeUnpartitionedCookie.attrs.secure = this.secure;
      }

      headers = pushCookie(headers, removeUnpartitionedCookie);
      // signed
      if (signed) {
        removeUnpartitionedCookie.name += '.sig';
        headers = ignoreCookiesByNameAndPath(
          headers,
          removeUnpartitionedCookie.name,
          removeUnpartitionedCookie.attrs.path
        );
        headers = pushCookie(headers, removeUnpartitionedCookie);
      }
    } else if (autoChips) {
      // add _CHIPS-${name} prefix cookie
      const newCookieName = this.#formatChipsCookieName(name);
      const newCookieOpts = {
        ...opts,
        partitioned: true,
      };
      const newPartitionedCookie = new Cookie(newCookieName, value, newCookieOpts);
      // if user not set secure, reset secure to ctx.secure
      if (opts.secure === undefined) newPartitionedCookie.attrs.secure = this.secure;

      headers = pushCookie(headers, newPartitionedCookie);
      // signed
      if (signed) {
        newPartitionedCookie.value = value && this.keys.sign(newPartitionedCookie.toString());
        newPartitionedCookie.name += '.sig';
        headers = ignoreCookiesByNameAndPath(headers, newPartitionedCookie.name, newPartitionedCookie.attrs.path);
        headers = pushCookie(headers, newPartitionedCookie);
      }
    }

    const cookie = new Cookie(name, value, opts);
    // if user not set secure, reset secure to ctx.secure
    if (opts.secure === undefined) {
      cookie.attrs.secure = this.secure;
    }
    headers = pushCookie(headers, cookie);

    // signed
    if (signed) {
      cookie.value = value && this.keys.sign(cookie.toString());
      cookie.name += '.sig';
      headers = pushCookie(headers, cookie);
    }

    this.ctx.set('set-cookie', headers);
    return this;
  }

  #formatChipsCookieName(name: string) {
    return `_CHIPS-${name}`;
  }

  #parseChromiumAndMajorVersion(userAgent: string) {
    if (!this.#parseChromiumResult) {
      this.#parseChromiumResult = parseChromiumAndMajorVersion(userAgent);
    }
    return this.#parseChromiumResult;
  }

  isSameSiteNoneCompatible(userAgent: string) {
    // Chrome >= 80.0.0.0
    const result = this.#parseChromiumAndMajorVersion(userAgent);
    if (result.chromium) {
      return result.majorVersion >= 80;
    }
    return isSameSiteNoneCompatible(userAgent);
  }

  isPartitionedCompatible(userAgent: string) {
    // support: Chrome >= 114.0.0.0
    // default enable: Chrome >= 118.0.0.0
    // https://developers.google.com/privacy-sandbox/3pcd/chips
    const result = this.#parseChromiumAndMajorVersion(userAgent);
    if (result.chromium) {
      return result.majorVersion >= 118;
    }
    return false;
  }
}

interface ParseChromiumResult {
  chromium: boolean;
  majorVersion: number;
}

// https://github.com/linsight/should-send-same-site-none/blob/master/index.js#L86
function parseChromiumAndMajorVersion(userAgent: string): ParseChromiumResult {
  const m = /Chrom[^ /]{1,100}\/(\d{1,100}?)\./.exec(userAgent);
  if (!m) {
    return { chromium: false, majorVersion: 0 };
  }
  // Extract digits from first capturing group.
  return { chromium: true, majorVersion: parseInt(m[1]) };
}

const _patternCache = new Map<string, RegExp>();
function getPattern(name: string) {
  const cache = _patternCache.get(name);
  if (cache) {
    return cache;
  }
  const reg = new RegExp('(?:^|;) *' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)');
  _patternCache.set(name, reg);
  return reg;
}

function computeSigned(opts: { encrypt?: boolean; signed?: boolean | number }) {
  // encrypt default to false, signed default to true.
  // disable singed when encrypt is true.
  if (opts.encrypt) return false;
  return opts.signed !== false;
}

function pushCookie(cookies: string[], cookie: Cookie) {
  if (cookie.attrs.overwrite) {
    cookies = ignoreCookiesByName(cookies, cookie.name);
  }
  cookies.push(cookie.toHeader());
  return cookies;
}

function ignoreCookiesByName(cookies: string[], name: string) {
  const prefix = `${name}=`;
  return cookies.filter(c => !c.startsWith(prefix));
}

function ignoreCookiesByNameAndPath(cookies: string[], name: string, path: string | null | undefined) {
  if (!path) {
    return ignoreCookiesByName(cookies, name);
  }
  const prefix = `${name}=`;
  // foo=hello; path=/path1; samesite=none
  const includedPath = `; path=${path};`;
  // foo=hello; path=/path1
  const endsWithPath = `; path=${path}`;
  return cookies.filter(c => {
    if (c.startsWith(prefix)) {
      if (c.includes(includedPath) || c.endsWith(endsWithPath)) {
        return false;
      }
    }
    return true;
  });
}
