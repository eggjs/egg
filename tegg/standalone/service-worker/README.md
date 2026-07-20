# @eggjs/service-worker

Run HTTP controllers and MCP tools from a tegg module using the Fetch API,
without starting an Egg application.

## Install

```bash
npm install @eggjs/service-worker
```

The application directory must be a tegg module containing decorated classes
and a `package.json` with `eggModule.name`. It may also contain `module.yml` for
application configuration.

## Node.js server

```ts
import { ServiceWorkerApp } from '@eggjs/service-worker';

const app = new ServiceWorkerApp('/path/to/module');
await app.serve({ port: 7001 });

// Call await app.destroy() during application shutdown.
```

## Fetch runtimes

Pass a fetch event to `handleEvent()`. The application initializes on the first
event.

```ts
import { ServiceWorkerApp } from '@eggjs/service-worker';
import type { FetchEvent } from '@eggjs/tegg/standalone';

const app = new ServiceWorkerApp('/path/to/module');

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  fetch(request: Request, _env: unknown, ctx: WorkerContext): Promise<Response> {
    const event: FetchEvent = {
      type: 'fetch',
      request,
      waitUntil: (promise) => ctx.waitUntil(promise),
    };
    return app.handleEvent<Response>(event);
  },
};
```

Use `egg-bin bundle` for runtimes without access to the application filesystem:

```bash
egg-bin bundle \
  --framework @eggjs/service-worker \
  --entry worker.ts \
  --output dist-worker
```

See `examples/helloworld-service-worker` for a complete Node.js and Cloudflare
Workers example.

## HTTP controllers

The fetch transport supports `@HTTPBody`, `@HTTPParam`, `@HTTPQuery`,
`@HTTPQueries`, `@HTTPHeaders`, `@HTTPCookies`, and `@Request` parameters.
`@Request` receives the native Fetch `Request`.

Controller methods may return a Fetch `Response`, a string, binary data, a
`Readable` or `ReadableStream`, or a value to serialize as JSON. Headers added
to `ctx.responseHeaders` are merged into the final response. Streaming bodies
keep their request-scoped objects alive until the stream finishes.

`@HTTPCookies` supports unsigned cookie reads and writes, including multiple
`Set-Cookie` headers. Cookie signing and encryption are not provided by the
fetch transport.

Framework-generated errors use a `{ code, message }` JSON body. Applications
can provide an `errorResponseMapper` inner object to map unhandled controller
errors to a custom `Response`.

## MCP controllers

`@MCPController`, `@MCPTool`, `@MCPPrompt`, and `@MCPResource` are exposed as
stateless Streamable HTTP endpoints:

- default server: `/mcp` and `/mcp/stream`;
- named server: `/mcp/<name>` and `/mcp/<name>/stream`.

POST handles MCP requests. GET and DELETE return 405. Each request uses a new
MCP server and transport instance.

MCP transport settings come from the entry module's `module.yml`:

```yaml
mcp:
  allowedHosts:
    - example.com
  allowedOrigins:
    - https://example.com
  enableDnsRebindingProtection: true
```

Provide authentication and other host capabilities through
`innerObjectHandlers`:

```ts
const app = new ServiceWorkerApp(cwd, {
  innerObjectHandlers: {
    mcpAuthHandler: [
      {
        obj: {
          async authenticate(request: Request) {
            if (request.headers.get('x-token') !== 'secret') {
              return new Response('Unauthorized', { status: 401 });
            }
          },
        },
      },
    ],
  },
});
```

The same mechanism can provide `fetchContextFactory`, `errorResponseMapper`,
or application-specific injectable objects such as `httpclient`. Use the
dedicated `logger` option to replace the default console logger. Framework-owned
`config`, `moduleConfigs`, `moduleConfig`, and `runtimeConfig` objects cannot be
overridden through `innerObjectHandlers`.

## Background tasks

`BackgroundTaskHelper` is available in every request context. Context
destruction waits for pending tasks according to
`config.backgroundTask.timeout`; set the timeout to `0` to wait indefinitely.
