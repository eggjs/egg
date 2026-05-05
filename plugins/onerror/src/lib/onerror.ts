import http from 'node:http';
import { debuglog, inspect } from 'node:util';

const debug = debuglog('egg-onerror');

export type OnerrorError = Error & {
  status: number;
  code?: string;
  headers?: Record<string, string>;
  expose?: boolean;
};

export type OnerrorHandler = (err: OnerrorError, ctx: any) => void;

export interface OnerrorOptions {
  text?: OnerrorHandler;
  json?: OnerrorHandler;
  html?: OnerrorHandler;
  all?: OnerrorHandler;
  js?: OnerrorHandler;
  redirect?: string | null;
  accepts?: (...args: string[]) => string;
}

const defaultOptions: OnerrorOptions = {
  text,
  json,
  html,
};

export function onerror(app: any, options?: OnerrorOptions): any {
  options = { ...defaultOptions, ...options };

  app.context.onerror = function (err: any) {
    debug('onerror: %s', err);
    if (err == null) return;

    if (typeof this.req?.resume === 'function') {
      this.req.resume();
      debug('resume the req stream');
    }

    if (!(err instanceof Error)) {
      debug('err is not an instance of Error');
      let errMsg = err;
      if (typeof err === 'object') {
        try {
          errMsg = JSON.stringify(err);
        } catch (e) {
          debug('stringify error: %s', e);
          errMsg = inspect(err);
        }
      }
      const newError = new Error('non-error thrown: ' + errMsg);
      if (err) {
        if (err.name) newError.name = err.name;
        if (err.message) newError.message = err.message;
        if (err.stack) newError.stack = err.stack;
        if (err.status) Reflect.set(newError, 'status', err.status);
        if (err.headers) Reflect.set(newError, 'headers', err.headers);
      }
      err = newError;
      debug('wrap err: %s', err);
    }

    const headerSent = this.headerSent || !this.writable;
    if (headerSent) {
      debug('headerSent is true');
      err.headerSent = true;
    }

    this.app.emit('error', err, this);
    if (headerSent) return;

    if (err.code === 'ENOENT') {
      err.status = 404;
    }
    if (typeof err.status !== 'number' || !http.STATUS_CODES[err.status]) {
      err.status = 500;
    }
    this.status = err.status;

    clearResponseHeaders(this);
    if (err.headers) {
      this.set(err.headers);
    }
    let type: string;
    if (options.accepts) {
      type = options.accepts.call(this, 'html', 'text', 'json', 'js');
    } else {
      type = this.accepts('html', 'text', 'json', 'js');
    }
    debug('accepts type: %s', type);
    type = type || 'text';
    if (options.all) {
      options.all.call(this, err, this);
    } else if (options.redirect && type !== 'json') {
      this.redirect(options.redirect);
    } else {
      const handler = getHandler(options, type);
      handler?.call(this, err, this);
      this.type = type;
    }

    if (type === 'json' && typeof this.body !== 'string') {
      this.body = JSON.stringify(this.body);
    }
    debug('end the response, body: %s', this.body);
    this.res.end(this.body);
  };

  return app;
}

function getHandler(options: OnerrorOptions, type: string): OnerrorHandler | undefined {
  if (type === 'html' || type === 'text' || type === 'json' || type === 'js') {
    return options[type];
  }
}

function isDev(): boolean {
  return !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
}

function text(err: OnerrorError, ctx: any): void {
  ctx.body = (isDev() || err.expose) && err.message ? err.message : http.STATUS_CODES[ctx.status];
}

function json(err: OnerrorError, ctx: any): void {
  const message = (isDev() || err.expose) && err.message ? err.message : http.STATUS_CODES[ctx.status];
  ctx.body = { error: message };
}

function html(err: OnerrorError, ctx: any): void {
  const message = (isDev() || err.expose) && err.message ? err.message : http.STATUS_CODES[ctx.status];
  ctx.body = `<h2>${escapeHtml(String(err.status))} ${escapeHtml(String(message))}</h2>`;
  ctx.type = 'html';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function clearResponseHeaders(ctx: any): void {
  const headers = ctx.response?.header ?? ctx.response?.headers ?? ctx.res.getHeaders?.() ?? {};
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === 'set-cookie') continue;
    ctx.res.removeHeader(name);
  }
}
