export interface CookieSetOptions {
  path?: string;
  domain?: string;
  expires?: Date;
  /** Seconds until expiry. */
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | 'strict' | 'lax' | 'none';
  /** CHIPS partitioned cookie (`; Partitioned`); requires `secure`. */
  partitioned?: boolean;
  /** Chrome cookie priority (`; Priority=Low|Medium|High`). */
  priority?: 'low' | 'medium' | 'high';
  /** Drop any existing `Set-Cookie` with the same name before appending. */
  overwrite?: boolean;
}

// `@eggjs/cookies` field validation (RFC 7230 field-content + attribute values).
// oxlint-disable-next-line no-control-regex
const FIELD_CONTENT_REGEXP = /^[	 -~-ÿ]+$/;
const SAME_SITE_REGEXP = /^(?:none|lax|strict)$/i;
const PRIORITY_REGEXP = /^(?:low|medium|high)$/i;

function assertField(valid: boolean, message: string): void {
  if (!valid) {
    throw new Error(message);
  }
}

function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) {
    return cookies;
  }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const name = part.slice(0, eq).trim();
    // Raw value (no decode / dequote), matching `@eggjs/cookies`.
    if (!cookies.has(name)) {
      cookies.set(name, part.slice(eq + 1).trim());
    }
  }
  return cookies;
}

function capitalize(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function serializeCookie(name: string, value: string | null | undefined, opts: CookieSetOptions): string {
  const deleting = value === null || value === undefined;
  assertField(FIELD_CONTENT_REGEXP.test(name), 'argument name is invalid');
  assertField(value == null || FIELD_CONTENT_REGEXP.test(value), 'argument value is invalid');
  assertField(opts.path === undefined || FIELD_CONTENT_REGEXP.test(opts.path), 'argument option path is invalid');
  assertField(opts.domain === undefined || FIELD_CONTENT_REGEXP.test(opts.domain), 'argument option domain is invalid');
  assertField(
    opts.sameSite === undefined || typeof opts.sameSite === 'boolean' || SAME_SITE_REGEXP.test(opts.sameSite),
    'argument option sameSite is invalid',
  );
  assertField(
    opts.priority === undefined || PRIORITY_REGEXP.test(opts.priority),
    'argument option priority is invalid',
  );

  // Raw value (no encode), matching `@eggjs/cookies`.
  let cookie = `${name}=${deleting ? '' : value}`;
  cookie += `; Path=${opts.path ?? '/'}`;
  if (opts.domain) {
    cookie += `; Domain=${opts.domain}`;
  }
  if (deleting) {
    cookie += '; Max-Age=0';
  } else if (opts.maxAge !== undefined) {
    cookie += `; Max-Age=${Math.floor(opts.maxAge)}`;
  }
  if (opts.expires) {
    cookie += `; Expires=${opts.expires.toUTCString()}`;
  }
  if (opts.httpOnly) {
    cookie += '; HttpOnly';
  }
  if (opts.secure) {
    cookie += '; Secure';
  }
  if (opts.sameSite) {
    cookie += `; SameSite=${capitalize(opts.sameSite === true ? 'strict' : opts.sameSite)}`;
  }
  if (opts.partitioned) {
    cookie += '; Partitioned';
  }
  if (opts.priority) {
    cookie += `; Priority=${capitalize(opts.priority)}`;
  }
  return cookie;
}

/**
 * The fetch host's `@HTTPCookies()` implementation — web-standard and edge-clean
 * (no `@eggjs/cookies` app coupling or its heavy egg-flavored deps). Reads
 * request cookies from the `Cookie` header and writes response cookies as
 * `Set-Cookie` onto the context's `responseHeaders` (merged onto the final
 * Response). Values are stored/read raw and validated the same way as
 * `@eggjs/cookies`; signing/encryption are not implemented (inject
 * `@eggjs/cookies` if needed).
 */
export class ServiceWorkerCookies {
  readonly #request: Request;
  readonly #responseHeaders: Headers;
  #parsed?: Map<string, string>;

  constructor(request: Request, responseHeaders: Headers) {
    this.#request = request;
    this.#responseHeaders = responseHeaders;
  }

  get(name: string): string | undefined {
    this.#parsed ??= parseCookieHeader(this.#request.headers.get('cookie'));
    return this.#parsed.get(name);
  }

  set(name: string, value?: string | null, opts?: CookieSetOptions): this {
    const options = opts ?? {};
    if (options.overwrite) {
      const kept = this.#responseHeaders.getSetCookie().filter((cookie) => !cookie.startsWith(`${name}=`));
      this.#responseHeaders.delete('set-cookie');
      for (const cookie of kept) {
        this.#responseHeaders.append('set-cookie', cookie);
      }
    }
    this.#responseHeaders.append('set-cookie', serializeCookie(name, value, options));
    return this;
  }
}
