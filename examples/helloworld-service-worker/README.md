# helloworld-service-worker

Minimal example of `@eggjs/service-worker`: a tegg module served through the
standalone service worker runtime — HTTP controllers and MCP tools over the
same fetch event loop, no egg application required.

## Run

```bash
# from the monorepo root
ut install --from pnpm
node --import=@oxc-node/core/register examples/helloworld-service-worker/main.ts
```

Then:

```bash
curl 'http://127.0.0.1:7001/hello/?name=you'
# {"message":"hello, you"}

curl -X POST 'http://127.0.0.1:7001/mcp/calc/stream' \
  -H 'accept: application/json, text/event-stream' \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add","arguments":{"a":1,"b":41}}}'
```

## What's inside

- `app/` — the tegg module (its `package.json` declares `eggModule.name`):
  - `HelloController.ts` — an `@HTTPController` bound to `GET /hello/`.
  - `CalcMCPController.ts` — an `@MCPController` exposing an `add` tool over
    MCP stateless streamable HTTP at `/mcp/calc`.
  - `HelloService.ts` — a `@ContextProto` service injected into both.
- `main.ts` — boots `ServiceWorkerApp` on the module dir and serves it over
  `node:http`. The entry lives outside `app/` so the module scan doesn't
  execute it.
- `fetch-event.ts` — the same app driven through the Web Service Worker fetch
  interface (`self.addEventListener('fetch', e => e.respondWith(app.handleEvent(e)))`)
  instead of `serve()`. Run with `npm run start:fetch-event`.

## Test

```bash
# from the monorepo root
utx vitest run examples/helloworld-service-worker --config examples/helloworld-service-worker/vitest.config.ts
```
