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
- `worker.ts` — the Cloudflare Workers entry: a plain `new ServiceWorkerApp(dir)`
  plus `export default { fetch }`. Nothing here is bundle-only, so it also runs
  directly under Node (runtime module scan). The bundler injects the
  framework-scanned imports and the manifest ahead of this file at build time.
  Bundled with `npm run bundle:cf` (`egg-bin bundle`, see below).
- `worker-sw.ts` + `run-sw.mjs` — the same app in the legacy **service-worker
  format** (`addEventListener('fetch', …)` instead of `export default { fetch }`).
  See "Service-worker format" below.

## Cloudflare Workers

The same `worker.ts` runs on Cloudflare workerd. Node needs no bundle (it reads the
module dir directly at runtime); workerd has no runtime filesystem, so the modules
are discovered at build time and inlined. The bundler prepends the scanned imports
and the manifest to a build-managed copy of `worker.ts` (leaving your source
untouched), so `worker.ts` stays a plain, locally-runnable entry:

```bash
npm run bundle:cf            # egg-bin bundle --framework @eggjs/service-worker --entry worker.ts
                            # -> .worker-cf/index.mjs (export default { fetch })
wrangler dev                 # local workerd, or `wrangler deploy`
```

`egg-bin bundle` is the one-shot CLI: it selects the standalone target because
`--framework @eggjs/service-worker` exports `loadMetadata` (there is no separate
metadata step), then bundles `--entry worker.ts`. A published `@eggjs/service-worker`
runs it under plain Node; inside this monorepo the script wraps it with
`@oxc-node/core/register` so the workspace's TypeScript sources load.

`wrangler.jsonc` sets `nodejs_compat` (tegg needs `AsyncLocalStorage`) and points
`main` at the bundle. The same `GET /hello/` and `POST /mcp/calc/stream` routes
work unchanged.

## Service-worker format

`StandaloneWorkerBundler` also supports the legacy **service-worker format** —
`format: 'service-worker'`, driven by `worker-sw.ts`
(`addEventListener('fetch', e => e.respondWith(app.handleEvent(e)))`). The output
is a classic (non-module) script that registers its fetch listener on evaluation,
so the bundler points the entry straight at `.worker-sw/worker.cjs` with no ESM
wrapper.

```bash
npm run bundle:sw            # -> .worker-sw/worker.cjs (addEventListener('fetch'))
npm run start:sw-bundle      # run the bundle in a minimal Web Service Worker shell
# service-worker bundle /hello: 200 { message: 'hello, sw' }
# service-worker bundle /mcp:  200 ... "hello, mcp: 42"
```

This format targets **Web Service Worker / edge runtimes** that expose a global
`addEventListener('fetch')`. It is **not** a Cloudflare workerd target: workerd's
`nodejs_compat` — which tegg needs for `AsyncLocalStorage` — only supports the
module-worker format, and `wrangler` rejects a service-worker-format script that
imports Node builtins. Use `worker.ts` (module format) for Cloudflare; use this
format for hosts that provide the fetch-event global without Node builtins.
`run-sw.mjs` demonstrates it by shimming that global under Node.

## Test

```bash
# from the monorepo root
utx vitest run examples/helloworld-service-worker --config examples/helloworld-service-worker/vitest.config.ts
```
