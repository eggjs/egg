import assert from 'node:assert';

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/; // eslint-disable-line no-control-regex

/**
 * RegExp to match Same-Site cookie attribute value.
 * https://en.wikipedia.org/wiki/HTTP_cookie#SameSite_cookie
 */
const sameSiteRegExp = /^(?:none|lax|strict)$/i;

/**
 * RegExp to match Priority cookie attribute value.
 */
const PRIORITY_REGEXP = /^(?:low|medium|high)$/i;

export interface CookieSetOptions {
  /**
   * The path for the cookie to be set in
   */
  path?: string | null;
  /**
   * The domain for the cookie
   */
  domain?: string | (() => string);
  /**
   * Is overridable
   */
  overwrite?: boolean;
  /**
   * Is the same site
   */
  sameSite?: string | boolean;
  /**
   * Encrypt the cookie's value or not
   */
  encrypt?: boolean;
  /**
   * Max age for browsers
   */
  maxAge?: number;
  /**
   * Expire time
   */
  expires?: Date;
  /**
   * Is for http only
   */
  httpOnly?: boolean;
  /**
   * Encrypt the cookie's value or not
   */
  secure?: boolean;

  /**
   * Once `true` and secure set to `true`, ignore the secure error in a none-ssl environment.
   */
  ignoreSecureError?: boolean;
  /**
   * Is it signed or not.
   */
  signed?: boolean | number;
  /**
   * Is it partitioned or not.
   */
  partitioned?: boolean;
  /**
   * Remove unpartitioned same name cookie or not.
   */
  removeUnpartitioned?: boolean;
  /**
   * The cookie priority.
   */
  priority?: 'low' | 'medium' | 'high' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export class Cookie {
  name: string;
  value: string;
  readonly attrs: CookieSetOptions;

  constructor(name: string, value?: string | null, attrs?: CookieSetOptions) {
    assert(fieldContentRegExp.test(name), 'argument name is invalid');
    assert(!value || fieldContentRegExp.test(value), 'argument value is invalid');
    this.name = name;
    this.value = value ?? '';
    this.attrs = mergeDefaultAttrs(attrs);
    assert(!this.attrs.path || fieldContentRegExp.test(this.attrs.path), 'argument option path is invalid');
    if (typeof this.attrs.domain === 'function') {
      this.attrs.domain = this.attrs.domain();
    }
    assert(!this.attrs.domain || fieldContentRegExp.test(this.attrs.domain), 'argument option domain is invalid');
    assert(
      !this.attrs.sameSite || this.attrs.sameSite === true || sameSiteRegExp.test(this.attrs.sameSite),
      'argument option sameSite is invalid'
    );
    assert(!this.attrs.priority || PRIORITY_REGEXP.test(this.attrs.priority), 'argument option priority is invalid');
    if (!value) {
      this.attrs.expires = new Date(0);
      // make sure maxAge is empty
      this.attrs.maxAge = undefined;
    }
  }

  toString() {
    return this.name + '=' + this.value;
  }

  toHeader() {
    let header = this.toString();
    const attrs = this.attrs;
    if (attrs.path) {
      header += '; path=' + attrs.path;
    }
    const maxAge = typeof attrs.maxAge === 'string' ? parseInt(attrs.maxAge, 10) : attrs.maxAge;
    // ignore 0, `session` and other invalid maxAge
    if (maxAge) {
      header += '; max-age=' + Math.round(maxAge / 1000);
      attrs.expires = new Date(Date.now() + maxAge);
    }
    if (attrs.expires) {
      header += '; expires=' + attrs.expires.toUTCString();
    }
    if (attrs.domain) {
      header += '; domain=' + attrs.domain;
    }
    if (attrs.priority) {
      header += '; priority=' + attrs.priority.toLowerCase();
    }
    if (attrs.sameSite) {
      header += '; samesite=' + (attrs.sameSite === true ? 'strict' : attrs.sameSite.toLowerCase());
    }
    if (attrs.secure) {
      header += '; secure';
    }
    if (attrs.httpOnly) {
      header += '; httponly';
    }
    if (attrs.partitioned) {
      header += '; partitioned';
    }
    return header;
  }
}

function mergeDefaultAttrs(attrs?: CookieSetOptions) {
  const merged = {
    path: '/',
    httpOnly: true,
    secure: false,
    overwrite: false,
    sameSite: false,
    partitioned: false,
    priority: undefined,
    ...attrs,
  };
  return merged;
}
