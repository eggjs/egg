import { strict as assert } from 'node:assert';

import { afterEach, describe, it } from 'vitest';

import { onerror, type OnerrorError, type OnerrorOptions } from '../src/lib/onerror.ts';

interface TestContext {
  app: TestApp;
  req: { resumed: boolean; resume: () => void };
  res: { end: (body: unknown) => void; removeHeader: (name: string) => void; getHeaders: () => Record<string, string> };
  response: { header: Record<string, string> };
  writable: boolean;
  headerSent: boolean;
  status: number;
  type?: string;
  body?: unknown;
  endedBody?: unknown;
  removedHeaders: string[];
  setCalls: unknown[];
  acceptArgs?: string[];
  accepts: (...args: string[]) => string;
  set: (headers: unknown) => void;
  redirect: (url: string) => void;
  redirectedTo?: string;
}

interface TestApp {
  context: { onerror?: (this: TestContext, err: unknown) => void };
  emitted: unknown[][];
  emit: (...args: unknown[]) => void;
}

function createApp(options?: OnerrorOptions): TestApp {
  const app: TestApp = {
    context: {},
    emitted: [],
    emit(...args: unknown[]) {
      this.emitted.push(args);
    },
  };
  onerror(app, options);
  return app;
}

function createContext(app: TestApp, type: string): TestContext {
  const headers: Record<string, string> = { 'x-old': '1' };
  const ctx = {
    app,
    req: {
      resumed: false,
      resume() {
        this.resumed = true;
      },
    },
    res: {
      end(body: unknown) {
        ctx.endedBody = body;
      },
      removeHeader(name: string) {
        ctx.removedHeaders.push(name);
        delete headers[name];
      },
      getHeaders() {
        return headers;
      },
    },
    response: { header: headers },
    writable: true,
    headerSent: false,
    status: 200,
    removedHeaders: [] as string[],
    setCalls: [] as unknown[],
    accepts(...args: string[]) {
      ctx.acceptArgs = args;
      return type;
    },
    set(value: unknown) {
      ctx.setCalls.push(value);
    },
    redirect(url: string) {
      ctx.redirectedTo = url;
    },
  } as TestContext;
  return ctx;
}

function callOnerror(app: TestApp, ctx: TestContext, err: unknown): void {
  assert(app.context.onerror);
  app.context.onerror.call(ctx, err);
}

function makeError(status: number, message = 'boom', extra?: Partial<OnerrorError>): OnerrorError {
  return Object.assign(new Error(message), { status }, extra) as OnerrorError;
}

describe('lib/onerror.ts', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('drains the request, emits the error, clears text headers, and reapplies error headers', () => {
    const app = createApp();
    const ctx = createContext(app, 'text');
    const err = makeError(418, 'teapot', { expose: true, headers: { 'x-new': '2' } });

    callOnerror(app, ctx, err);

    assert.equal(ctx.req.resumed, true);
    assert.equal(ctx.status, 418);
    assert.equal(ctx.body, 'teapot');
    assert.equal(ctx.endedBody, 'teapot');
    assert.equal(ctx.type, 'text');
    assert.deepEqual(ctx.removedHeaders, ['x-old']);
    assert.deepEqual(ctx.setCalls, [{ 'x-new': '2' }]);
    assert.deepEqual(ctx.acceptArgs, ['html', 'text', 'json', 'js']);
    assert.equal(app.emitted[0][0], 'error');
    assert.equal(app.emitted[0][1], err);
  });

  it('does not pass undefined headers into ctx.set', () => {
    const app = createApp();
    const ctx = createContext(app, 'json');
    ctx.response.header['set-cookie'] = 'csrf=token';

    callOnerror(app, ctx, makeError(500, 'boom', { expose: true }));

    assert.deepEqual(ctx.removedHeaders, ['x-old']);
    assert.deepEqual(ctx.setCalls, []);
    assert.equal(ctx.body, '{"error":"boom"}');
    assert.equal(ctx.endedBody, '{"error":"boom"}');
  });

  it('escapes default html responses', () => {
    const app = createApp();
    const ctx = createContext(app, 'html');

    callOnerror(app, ctx, makeError(400, `&<>"'`, { expose: true }));

    assert.equal(ctx.type, 'html');
    assert.equal(ctx.body, '<h2>400 &amp;&lt;&gt;&quot;&#39;</h2>');
    assert.equal(ctx.endedBody, '<h2>400 &amp;&lt;&gt;&quot;&#39;</h2>');
  });

  it('does not double stringify custom json string bodies', () => {
    const app = createApp({
      json(_err, ctx) {
        ctx.body = '{"ok":true}';
      },
    });
    const ctx = createContext(app, 'json');

    callOnerror(app, ctx, makeError(500));

    assert.equal(ctx.body, '{"ok":true}');
    assert.equal(ctx.endedBody, '{"ok":true}');
  });

  it('selects js handlers through default negotiation', () => {
    const app = createApp({
      js(err, ctx) {
        ctx.body = `jsonp:${err.message}`;
      },
    });
    const ctx = createContext(app, 'js');

    callOnerror(app, ctx, makeError(500, 'boom', { expose: true }));

    assert.deepEqual(ctx.acceptArgs, ['html', 'text', 'json', 'js']);
    assert.equal(ctx.type, 'js');
    assert.equal(ctx.body, 'jsonp:boom');
    assert.equal(ctx.endedBody, 'jsonp:boom');
  });

  it('wraps non-error throws and normalizes invalid status to 500', () => {
    const app = createApp();
    const ctx = createContext(app, 'json');

    callOnerror(app, ctx, { message: 'bad', status: 1 });

    assert.equal(ctx.status, 500);
    assert(app.emitted[0][1] instanceof Error);
    assert.equal((app.emitted[0][1] as Error).message, 'bad');
  });

  it('formats circular non-error throws when JSON.stringify fails', () => {
    const app = createApp();
    const ctx = createContext(app, 'json');
    const circular: Record<string, unknown> = { status: 400 };
    circular.self = circular;

    callOnerror(app, ctx, circular);

    assert(app.emitted[0][1] instanceof Error);
    assert.match((app.emitted[0][1] as Error).message, /\[Circular/);
  });

  it('supports custom accepts and all handlers', () => {
    let acceptArgs: string[] = [];
    const app = createApp({
      accepts(...args: string[]) {
        acceptArgs = args;
        return 'html';
      },
      all(err, ctx) {
        ctx.body = `all:${err.status}`;
      },
    });
    const ctx = createContext(app, 'json');
    const err = makeError(451, 'blocked', { headers: { 'x-reason': 'legal' } });

    callOnerror(app, ctx, err);

    assert.equal(ctx.body, 'all:451');
    assert.equal(ctx.endedBody, 'all:451');
    assert.deepEqual(ctx.setCalls, [{ 'x-reason': 'legal' }]);
    assert.deepEqual(ctx.removedHeaders, ['x-old']);
    assert.deepEqual(acceptArgs, ['html', 'text', 'json', 'js']);
  });

  it('redirects non-json responses when configured', () => {
    const app = createApp({ redirect: '/error-page' });
    const ctx = createContext(app, 'html');

    callOnerror(app, ctx, makeError(500));

    assert.equal(ctx.redirectedTo, '/error-page');
    assert.equal(ctx.endedBody, undefined);
  });

  it('only emits when headers were already sent', () => {
    const app = createApp();
    const ctx = createContext(app, 'text');
    ctx.headerSent = true;
    const err = makeError(500);

    callOnerror(app, ctx, err);

    assert.equal((err as OnerrorError & { headerSent?: boolean }).headerSent, true);
    assert.equal(app.emitted.length, 1);
    assert.equal(ctx.endedBody, undefined);
  });
});
