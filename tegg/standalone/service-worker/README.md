# @eggjs/service-worker

Serve a tegg module through service-worker semantics: fetch events in,
`Response` objects out. HTTP controllers (`@HTTPController`) and MCP tools
(`@MCPController`) run over the same event loop with full tegg dependency
injection — no egg application required.

The heavy lifting is shared with the egg host: controller metadata comes from
`@eggjs/controller-decorator` and the registration runtime from
the controller plugin's host-agnostic runtime (`@eggjs/controller-plugin`);
only the parameter binding and transport are
fetch-specific.

## Usage

Serve over `node:http`:

```ts
import { ServiceWorkerApp } from '@eggjs/service-worker';

const app = new ServiceWorkerApp('/path/to/module');
const server = await app.serve({ port: 7001 });
// ... handle requests ...
await app.destroy();
```

Or embedded — hand `handleEvent` a fetch event, get a `Response` back (it
initializes the app on first call). On a real Service Worker / edge runtime wire
the native event straight through: `addEventListener('fetch', e => e.respondWith(app.handleEvent(e)))`.

```ts
import { ServiceWorkerApp } from '@eggjs/service-worker';

const app = new ServiceWorkerApp('/path/to/module');
const response = await app.handleEvent<Response>({
  type: 'fetch',
  request: new Request('http://localhost/hello/'),
});
await app.destroy();
```

A module is a plain tegg module: decorated classes plus a `package.json` with
`eggModule.name` (and optionally a `module.yml` for `ModuleConfigs`). See
`examples/helloworld-service-worker` for a runnable example.

## HTTP controllers

`@HTTPController` / `@HTTPMethod` work as in the egg host. Parameter binding
supports `@HTTPBody`, `@HTTPParam`, `@HTTPQuery`, `@HTTPQueries`,
`@HTTPHeaders`, and `@Request` (the raw fetch `Request`); `@Cookies` is not
supported under the fetch runtime and fails with an explicit error. A handler
may return a plain value (serialized to JSON), a string/Buffer/ReadableStream,
or a fetch `Response` (passed through as-is).

- Errors surface in a unified shape: `{ code, message }` JSON with
  `NOT_FOUND` (404) or `INTERNAL_SERVER_ERROR` (500).
- `ctx.responseHeaders` set by middlewares/controllers are merged onto the
  final response.
- Streaming/SSE responses keep the request's ContextProto objects alive until
  the client drains the body (bounded by `config.backgroundTask.timeout`;
  set it to `0` to wait indefinitely).

## MCP controllers

`@MCPController` / `@MCPTool` / `@MCPPrompt` / `@MCPResource` are served as
MCP **stateless streamable HTTP** under `POST /mcp[/name]/stream` (and
`/mcp[/name]`), using the MCP SDK's web-standard transport. Non-POST methods
get a 405 jsonrpc error. Each request builds a fresh server + transport, as
the SDK requires in stateless mode.

Authentication is an extension point (default: allow all):

```ts
const app = new ServiceWorkerApp(cwd, {
  mcpAuthHandler: {
    async authenticate(request) {
      if (request.headers.get('x-token') !== 'secret') {
        return new Response('unauthorized', { status: 401 });
      }
      return undefined; // let it through
    },
  },
});
```

## Host-provided inner objects

`ServiceWorkerApp` accepts `innerObjectHandlers` (from
`@eggjs/standalone`) to provide or override injectable singletons:

- `config` — also settable via the `config` option; read by
  `BackgroundTaskHelper` (`config.backgroundTask.timeout`).
- `logger` — defaults to `console`.
- `mcpAuthHandler` — also settable via the `mcpAuthHandler` option.
- `httpclient` is intentionally not bundled; provide your own via
  `innerObjectHandlers` if modules inject one.

## Background tasks

`BackgroundTaskHelper` from `@eggjs/background-task` is available in every
request context; ctx destroy drains pending tasks, same as the egg host.
