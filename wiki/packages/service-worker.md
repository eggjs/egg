---
title: Standalone service worker (@eggjs/service-worker[-runtime])
type: package
summary: Fetch-semantics standalone runtime — HTTP controllers and MCP tools served from a tegg module without an egg application
source_files:
  - tegg/standalone/service-worker-runtime/src
  - tegg/standalone/service-worker/src
  - tegg/standalone/service-worker-controller/src
  - tegg/core/controller-runtime/src
  - tegg/plugin/controller/src
  - examples/helloworld-service-worker
updated_at: 2026-07-10
status: active
---

Two packages provide the standalone service worker runtime on top of the
module-plugin mechanism (declarative `@InnerObjectProto` /
`@XxxLifecycleProto` hooks, see the module-plugin pages):

- `@eggjs/service-worker-runtime` — protocol-agnostic: `@Runner()` entry
  dispatching events to `@EventHandlerProto('<type>')` handlers, event
  injection into ContextProtos, `BackgroundTaskHelper` re-export
  (ctx-destroy draining).
- `@eggjs/service-worker-controller` — the fetch controller transport (the
  `serviceWorker` eggModule): `FetchEventHandler`, `FetchRouter` + fetch
  parameter binding (no `@Cookies`), `HTTP/MCP RegisterProvider`,
  `ServiceWorkerMcpRouter`, MCP stateless streamable HTTP under
  `/mcp[/name]/stream`.
- `@eggjs/service-worker` — the host app only: the `ServiceWorkerApp` facade
  over `StandaloneApp` with `serve()` (node:http bridge) and embedded
  `handleEvent()`. Its single frameworkDep is its OWN package root, so the
  framework modules (runtime + controller) are auto-discovered from its package
  deps via the node_modules eggModule convention — no hand-listed/ordered
  packages. Its `index` exports only `ServiceWorkerApp`; consumers import
  controller symbols from `@eggjs/service-worker-controller` directly.

Key mechanics and constraints:

- **Four-package controller layering** (mirrors the egg host): host-agnostic
  runtime `@eggjs/controller-runtime` (a plain LIBRARY, not an eggModule — base
  register classes, collect-only `MCPControllerRegister`, `McpRouter`/`Router`
  abstractions, `MCPServerHelper`, and the controller inner-object prototypes)
  → egg transport `@eggjs/controller-plugin` (the `teggController` plugin
  module) → fetch transport `@eggjs/service-worker-controller` (the
  `serviceWorker` module) → host app `@eggjs/service-worker`. Each HOST package
  owns the scanned eggModule and re-exports the runtime's inner-object protos
  into it (`runtimeProtos.ts`); the runtime library itself is never scanned.
  The service worker depends only on the egg-free runtime, never on the egg
  plugin.
- **Host-agnostic MCP register + `McpRouter` boundary**: the shared
  `MCPControllerRegister` (controller-plugin) only COLLECTS tool/resource/prompt
  records and delegates transport to an injected `McpRouter`
  (`registerServer(reg)`); it no longer touches `app`. The egg host's node-HTTP
  transport is `EggMcpRouter` (built imperatively in the controller plugin's
  `app.ts`, which holds `app`), the service worker's fetch transport is
  `ServiceWorkerMcpRouter`. Both provide the `mcpRouter` DI object; the two host
  plugins are never used together, so the shared name does not collide. Because
  the register needs no `app`, the egg host no longer provides `eggApp` as a
  module inner object — the Egg `Application` is out of the module DI graph.
- **MCP SDK >= 1.29 stateless transports are single-shot** (reuse throws), so
  each MCP request builds a fresh `MCPServerHelper` + web-standard transport
  from register records collected at boot. The service worker's
  `ServiceWorkerMcpRouter` uses `WebStandardStreamableHTTPServerTransport`
  (Request in, Response out) — no node req/res bridging. Auth is an
  `mcpAuthHandler` extension point (default: allow).
- **Streaming lifecycle**: `FetchEventHandler` routes every response body
  through a passthrough and registers the drain as a background task, so ctx
  destroy waits (bounded by `config.backgroundTask.timeout`) until the client
  consumes the stream.
- **Unified errors**: framework failures reply `{ code, message }` JSON
  (`NOT_FOUND` / `INTERNAL_SERVER_ERROR`); `ctx.responseHeaders` merge onto
  the final response.
- **frameworkDeps scan excludes `test/**`\*\*: the framework packages are
  themselves modules; without the exclusion their test fixtures load as
  business modules (duplicate controller names) in workspace layouts.
- **`StandaloneEggObjectFactory` pins `name: 'eggObjectFactory'`** (why module
  discovery order stopped mattering): it extends the base `EggObjectFactory`, so
  its derived proto name would be `standaloneEggObjectFactory` and would NOT
  satisfy `ServiceWorkerRunner`'s `@Inject() eggObjectFactory` locally — the
  inject would fall back to the global PUBLIC `eggObjectFactory` in
  `@eggjs/dynamic-inject-runtime`, whose availability depends on module scan
  order (runtime had to be scanned before controller). Pinning the name keeps
  resolution local to `serviceWorkerRuntime` and order-independent, which is what
  lets ServiceWorkerApp use a single own-package-root frameworkDep instead of a
  hand-ordered runtime/controller list.
- Per-app state is all inner objects in the app's TeggScope bag — two
  concurrent `ServiceWorkerApp`s are isolated (`test/MultiApp.test.ts`).

Example: `examples/helloworld-service-worker` (entry `main.ts` lives outside
the scanned `app/` module dir on purpose — the scan imports every module
file, and importing an entry that boots the app recurses).
