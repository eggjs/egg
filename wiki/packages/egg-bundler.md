---
title: Egg Bundler
type: package
summary: Bundles Egg applications for Node startup snapshots and tegg standalone service-worker targets.
source_files:
  - packages/core/src/lifecycle.ts
  - packages/egg/src/lib/egg.ts
  - plugins/watcher/src/lib/boot.ts
  - tools/egg-bundler/src/index.ts
  - tools/egg-bundler/src/lib/Bundler.ts
  - tools/egg-bundler/src/lib/EntryGenerator.ts
  - tools/egg-bundler/src/lib/ExternalsResolver.ts
  - tools/egg-bundler/src/lib/prelude.ts
  - tools/egg-bundler/src/lib/PackRunner.ts
  - tools/egg-bundler/src/lib/StandaloneWorkerBundler.ts
  - tools/egg-bundler/src/lib/importMetaPatch.ts
  - tools/egg-bin/src/commands/bundle.ts
  - tools/egg-bin/src/commands/snapshot.ts
  - tools/scripts/src/commands/start.ts
  - packages/loader-fs/src/index.ts
  - packages/loader-fs/src/manifest_loader_fs.ts
  - tegg/core/types/src/metadata/model/TeggManifest.ts
  - tegg/core/loader/src/LoaderFactory.ts
  - tegg/core/loader/src/LoaderUtil.ts
  - tegg/core/loader/src/TeggManifestLoaderFS.ts
  - tegg/core/loader/src/impl/ModuleLoader.ts
  - tegg/plugin/dal/src/lib/DataSource.ts
  - tegg/plugin/tegg/src/lib/EggModuleLoader.ts
  - tegg/standalone/standalone/src/EggModuleLoader.ts
  - tools/egg-bundler/docs/output-structure.md
  - examples/helloworld-service-worker
updated_at: 2026-08-04
status: active
---

# Egg Bundler

`@eggjs/egg-bundler` is a developer tooling package under `tools/egg-bundler/`.
It exposes `bundle(config)` and the `Bundler` class for producing a deployable
CommonJS artifact from an Egg application, plus `StandaloneWorkerBundler` for the
tegg standalone service worker (Cloudflare Workers) — see the section below.

The bundler engine (`PackRunner`) is `@utoo/pack`, whose engine is **Turbopack**
(not mako). `@utoo/pack` only emits **CommonJS** — `output.type` is `standalone`
or `export` (single-file self-executing IIFE); there is no ESM output. In
single-file (`export`) mode the IIFE ends with `module.exports = factory()` where
`factory()` returns the entry's ES-module namespace, so a Node `require()` of the
output exposes the entry's `export default`/named exports; `library.name`/`export`
only affect the `exports[name]`/`globalThis[name]` fallback branches. That CJS-only
constraint is why worker output always needs a thin ESM wrapper.

## Public Surfaces

- `tools/egg-bundler/src/index.ts` exports `bundle`, `Bundler`, the helper
  classes, and the public config/result types.
- `tools/egg-bin/src/commands/bundle.ts` wires the package into
  `egg-bin bundle`.

## Bundle Flow

1. `ManifestLoader` loads the app startup manifest, defaulting to
   `<baseDir>/.egg/manifest.json`.
2. `ExternalsResolver` classifies packages that should stay external.
3. `EntryGenerator` writes either one single-process worker entry or separate
   app-worker and agent-worker entries. Each installs the bundle manifest/module
   loader before starting its Egg runtime role.
4. `PackRunner` invokes `@utoo/pack`.
5. `Bundler` writes `bundle-manifest.json` and returns absolute output paths.

## Current Behavior

- Relative `outputDir` values are resolved from `baseDir`.
- Default mode is `production`; `development` is also accepted.
- If `<baseDir>/.egg/manifest.json` is missing, `ManifestLoader` starts the app
  with `metadataOnly: true` to generate it. This skips the agent and normal boot
  lifecycle, runs `loadMetadata()` hooks, and the manifest generation child
  process exits after writing the manifest, so registered `beforeClose` hooks do
  not run.
- The default `single` target runs in Egg single-process mode. Its worker entry treats the
  deploy output directory as the runtime Egg `baseDir`, passes the framework
  specifier explicitly to `startEgg`, maps that specifier to the already bundled
  framework module, and precomputes original app absolute aliases so bundled
  module lookup can serve relKeys, output-dir absolute paths, original app
  absolute paths, and manifest `resolveCache` request aliases.
- The `cluster` target emits `app_worker.js` and `agent_worker.js`. Their roles
  are fixed while generating the entries rather than selected by
  `EGG_PROCESS_TYPE` or another runtime switch. Both entries use the shared
  `@eggjs/cluster/worker_protocol` implementation, accept the master's normal
  JSON argv contract, and select process IPC or `worker_threads.parentPort`
  from `startMode`. Snapshot builds force each output to remain independently
  self-contained, so no common runtime chunk is emitted between the two files.
  Custom V8 snapshot blobs remain process-only because Node does not expose a
  per-Worker snapshot-blob API; option parsing rejects that combination before
  creating a worker thread.
- `egg-bin snapshot build --cluster` selects that target and runs two independent
  V8 snapshot builds: `app_worker.js` produces `app.snapshot.blob`, while
  `agent_worker.js` produces `agent.snapshot.blob`. Their paths can be set
  independently with `--app-snapshot-blob` and `--agent-snapshot-blob`; the
  existing `--blob` flag remains exclusive to single-process builds. The role
  comes from the entry filename/code, so snapshot construction does not use
  `EGG_SNAPSHOT_ROLE`.
- A `snapshot: true` output remains a normal runnable bundle; generating it does
  not dedicate the JavaScript file to blob restore. The prelude and generated
  entry use `v8.startupSnapshot.isBuildingSnapshot()` to detect a real
  `--build-snapshot` process. A plain invocation keeps Node's web globals intact,
  installs `__RUNTIME_REQUIRE` before the bundle IIFE, and follows the ordinary
  bundle startup path. Only snapshot construction installs build-time stubs. On
  restore, V8 does not re-evaluate the file and instead invokes the serialized
  deserialize main, which installs the same runtime require hook before resuming.
- `egg-scripts start --bundle` explicitly selects bundled cluster workers.
  `--bundle-dir` defaults to `./dist-bundle`, and supplies the fixed defaults
  `<bundle-dir>/app_worker.js` and `<bundle-dir>/agent_worker.js`; either worker
  path can be overridden explicitly. Snapshot restore is enabled per role only
  when `--app-snapshot-blob` or `--agent-snapshot-blob` is provided. Blob
  locations never determine worker paths, and one role's arguments never
  determine the other's. Bundle path and role options are ignored unless
  `--bundle` is present. The existing `--snapshot-blob` remains the single-process
  launcher and takes precedence when it is supplied together with `--bundle`.
- Explicit `externals.force` entries are external, and `ExternalsResolver`
  auto-detects root `peerDependencies`, root `optionalDependencies`, root
  dependency packages with native addons, root dependency packages whose optional
  peer dependencies cannot be resolved, the missing optional peer package names
  themselves as `extraExternals`, and native optional platform packages as
  external.
- `externals.inline` removes an auto-detected external unless the same package
  name is also listed in `externals.force`.
- ESM-only packages, `egg`, `@swc/helpers`, and `@eggjs/*` packages are bundled
  by default unless `externals.force` or dependency metadata applies. If a
  wrapper around native optional platform packages cannot be loaded through
  `createRequire`, the wrapper stays bundled and the platform packages are kept
  external.
- `BundlerConfig.tegg` is accepted but intentionally not wired into the current
  implementation yet.

### Snapshot lifecycle boundary

With `snapshot: true`, Egg executes `configWillLoad` during snapshot construction
and stops before `configDidLoad`. After V8 restores the heap, Egg runs the
registered `snapshotDidDeserialize` hooks and then resumes the ordinary lifecycle
from `configDidLoad`. Function-style app and agent boot hooks are registered as
`configDidLoad` hooks, so they already run on the runtime side of this boundary.

Plugin constructors and `configWillLoad` may prepare only serializable
configuration or metadata. Runtime resources such as cluster clients, sockets,
servers, filesystem watchers, timers, and native clients must be created in
`configDidLoad` or later. A plugin that consumes another plugin's runtime object
must also declare that plugin dependency; this makes the corresponding
`configDidLoad` order explicit instead of relying on incidental discovery order.

`EggApplicationCore.clusterWrapper()` enforces this contract by throwing during
snapshot construction and becoming available after restore. The watcher plugin
is the reference pattern: its boot constructor stores the app only,
`configDidLoad` creates and wires the watcher cluster client, and `didLoad` waits
for readiness. A generic deferred proxy is intentionally not used because it
would silently record arbitrary calls, cover only clients created through
`clusterWrapper()`, and move failures away from the actual lifecycle violation.

Framework-owned resources that necessarily exist before the cutoff may instead
implement a symmetric `snapshotWillSerialize`/`snapshotDidDeserialize` pair, as
Egg does for its messenger and logger transports. That mechanism is for explicit
resource ownership, not a substitute for moving plugin runtime initialization to
`configDidLoad`.

### Snapshot lazy-external defaults

In `snapshot: true` mode the bundler keeps a set of modules **lazy-external** so a
V8 startup snapshot stays serializable: each is emitted as an `externalRequire`,
left out of the build-time heap (a member-proxy stub from the prelude's
`__makeLazyExt`), and forwarded to the real module at restore via
`globalThis.__RUNTIME_REQUIRE`. The injected hook also lazy-stubs any **non-builtin**
external at build (`!__isBuiltin(id)`); the explicit list mainly exists to (a) cover
builtins the `!isBuiltin` rule skips and (b) **force npm packages external** that
would otherwise be inlined.

- `DEFAULT_SNAPSHOT_LAZY_MODULES` (in `src/lib/prelude.ts`) covers the Node network
  stack (`http`/`https`/`http2`/`tls`/`dns`), `inspector`, `cluster`/`node:cluster`,
  **and egg's HTTP client stack `undici` + `urllib`**. `cluster` is runtime-sensitive:
  Node chooses its primary or worker implementation when the module is first loaded,
  while snapshot construction happens outside a cluster worker. Keeping both module
  specifiers lazy ensures each restored worker loads the worker implementation instead
  of retaining the builder's primary implementation. Egg builds its `HttpClient` (urllib → undici) during
  boot, and undici instantiates an llhttp `WebAssembly` (disabled under
  `--build-snapshot`) + `HTTPParser` that cannot be serialized. As npm packages
  urllib/undici would be inlined; listing them forces them external (`Bundler` adds
  the lazy ids to the externals map) so the member-proxy stub is used at build — an
  app gets a serializable snapshot without listing them in `egg.snapshot.lazyModules`.
- The member-proxy records the build-time access path (`get`/`apply`/`construct`) and
  replays it against the real module on restore, so `class HttpClient extends
urllib.HttpClient` (and urllib's own `class BaseAgent extends undici.Agent`) keep
  working: the `extends` is evaluated against the build stub, then `super(...)` /
  inherited methods resolve to the real base class after deserialization.
- Proxy reads and writes preserve the inherited receiver at restore. Static or
  prototype accessors on the real base therefore observe the application subclass
  or instance as `this`, while direct proxy access still uses the real exported
  object. This is required by symbol-backed model state such as Leoric's
  `Bone.synchronized` accessor.

#### When does a new dependency need adding?

Only a package that **directly** creates non-serializable native/WASM state at
module-eval or boot-time instantiation needs a list entry (like `undici`, which
compiles llhttp WASM). A package that only reaches the network/native stack
**transitively** is already covered, because the underlying builtins are lazy:

- `@modelcontextprotocol/sdk` (a default tegg-controller dep, loaded at boot via
  `tegg/plugin/controller` → `MCPControllerRegister`) → its StreamableHTTP
  transport `require`s `@hono/node-server`, which does a top-level
  `require("http2")` + `class extends globalThis.Request`. `http2` is already lazy
  and `globalThis.Request` is stubbed by the prelude, and no MCP transport/server
  is instantiated at boot — so the SDK does **not** need a list entry.
- `@grpc/grpc-js`, `ws` — not present in OSS tegg; gRPC would route through the
  already-lazy `http2` anyway. No entry needed.

`Inference:` audited 2026-06-28 against `tegg/plugin/controller`, default egg
plugins, and the suspect packages' module-eval closures. The opt-in
`mcp-client`/`mcp-proxy`/`langchain` plugins pull the SDK _client_ transports
(`eventsource`/`cross-spawn`/`pkce-challenge`); if an app enables those and
snapshots, re-assess via `egg.snapshot.lazyModules` — that is an app concern, not
a framework default.

## Standalone Worker Bundle (Cloudflare Workers)

`StandaloneWorkerBundler` (`src/lib/StandaloneWorkerBundler.ts`) bundles a tegg
**standalone service worker** (`@eggjs/service-worker`, see the
[service worker page](./service-worker.md)) for Cloudflare workerd. This is a
separate path from the Egg app `Bundler`/`EntryGenerator` flow above — there is no
`startEgg`/`app.listen`; the artifact is a fetch handler.

**CLI.** `egg-bin bundle` drives it as a one-shot command (mirroring the egg-app
`egg-bin bundle`): a standalone bundle is selected by `--entry` (or `--target
standalone`); `--framework` names the app package (e.g. `@eggjs/service-worker`),
which must export `loadMetadata` (the standalone counterpart of the egg app's
framework specifier — no separate app-module/app-export flags). The command runs
`loadMetadata` + `StandaloneWorkerBundler` internally, so the caller never threads
the manifest by hand. The metadata scan runs in an `egg-bin` child process, where
the CLI's detected TypeScript compiler and configured `--require`/`--import`
hooks are active; a TypeScript standalone app therefore does not need to wrap the
bundle command in its own `NODE_OPTIONS`. `tools/egg-bin/src/commands/bundle.ts`
branches on the target, and `tools/egg-bin/scripts/standalone-metadata.mjs`
performs the scan.

**Injection-based seam.** The bundler does NOT synthesize the host entry. The user
authors a plain, locally-runnable `worker.ts`
(`new ServiceWorkerApp(dir)` + `export default { fetch }`, or `addEventListener`).
`run()` then:

1. Filters the caller-supplied tegg manifest (`ServiceWorkerApp.loadMetadata`)
   by `excludeModules` — a general escape hatch (teggDal no longer needs it: the
   bundle-mode dynamic-loader fix below makes a scanned-but-unused DAL module load
   cleanly).
2. Writes a **build-managed copy of the user's `entry` beside it** (a
   `.egg-worker-entry.ts` sibling, so the user's relative imports and
   `import.meta` resolve unchanged), prepending an injected prelude that
   static-imports every decorated file (so Turbopack bundles them) and installs
   `globalThis.__EGG_BUNDLE_MODULE_LOADER__` + `globalThis.__EGG_BUNDLE_MANIFEST__`.
   Evaluation order is safe because import declarations load before module bodies,
   so the globals are set before the user's `new ServiceWorkerApp(dir)` runs.
   `StandaloneApp.init` falls back to `__EGG_BUNDLE_MANIFEST__` when no `manifest`
   option is passed, so the same `worker.ts` runs bundled (global manifest) and
   unbundled under Node (runtime fs scan).
3. Runs `PackRunner` (`singleFile: true`, `useDefineForClassFields: true` — the
   `false` egg-app default would erase uninitialized `#x?: T;` private fields while
   the code still references `this.#x`), with node builtins external and
   `resolve.alias` mapping `globby`/`os`/`node:os` to inert stubs (bundle mode never
   globs; workerd's `nodejs_compat` has no `node:os`).
4. Applies `patchImportMetaInContent` (`src/lib/importMetaPatch.ts`) to fix
   Turbopack's broken `import.meta` shim (`__turbopack_context__.F` is otherwise
   undefined — breaks in Node AND workerd), writes the result as `worker.cjs`, and
   deletes the injected copy.
5. Emits the entry per `format`: `module` (default) → an ESM wrapper `index.mjs`
   (`import worker from './worker.cjs'; export default worker.default;` — a
   Cloudflare module worker); `service-worker` → no wrapper, the entry is
   `worker.cjs` itself (a classic, non-module script whose
   `addEventListener('fetch')` registered on evaluation; an ESM wrapper would move
   it to module scope where workerd does not dispatch fetch events).

`wrangler.jsonc` sets `nodejs_compat` (tegg needs `AsyncLocalStorage`) and points
`main` at the wrapper. Verified on Node and workerd (`wrangler dev`): the example's
`GET /hello/` and `POST /mcp/calc/stream` both return 200. Example:
`examples/helloworld-service-worker/{worker.ts,wrangler.jsonc}`, built via
`npm run bundle:cf` (`egg-bin bundle --framework @eggjs/service-worker --entry worker.ts`).

**Bundle-mode dynamic module loading.** Egg and standalone adapt the shared
`TeggManifest.moduleDescriptors[].decoratedFiles` data through the same
`createTeggManifestLoaderFS()` helper. The result is a `ManifestLoaderFS`
overlay: manifest-indexed decorated files are authoritative, while the host's
normal loader view may remain as a fallback for unrelated files.

The host passes that view into the initial `LoaderFactory.loadApp()` scan.
`ModuleLoader.createModuleLoader()` then installs an explicitly supplied view in
the current application's `TeggScope`; later loader creation in the same app
reuses it. This matters for dynamic multi-instance discovery: DAL's
`DataSource.getObjects()` still creates a module loader and calls `load()` to
find table classes, but in a bundle that scan now reads the scoped manifest view
instead of the unavailable runtime filesystem. No class list is added to
`MultiInstancePrototypeGetObjectsContext`, and generic `LoaderFS` construction
remains side-effect free.

The common `ModuleLoader` does not read bundle globals. It first asks its
`LoaderFS` for an authoritative file list. `ManifestLoaderFS` returns the exact
manifest-indexed decorated files, including TypeScript-origin keys and an
authoritative empty list; only a source without such a view falls back to
`LoaderUtil.filePattern()` plus `LoaderFS.glob()`. The standalone host uses
`globalThis.__EGG_BUNDLE_MANIFEST__` only as an entry source for the shared
manifest and constructs the same loader view as Egg.

This source-level distinction matters when `egg-scripts start` sets
`EGG_TS_ENABLE=false`: real filesystem discovery still excludes TypeScript,
while `.ts`/`.mts`/`.cts` manifest keys remain discoverable because they resolve
from the in-memory bundle module map rather than files Node must execute. No
bundle-specific condition is added to `LoaderUtil`.

Module identity follows a separate path. Bundle hosts obtain the name from the
shared `TeggManifest`, normal hosts resolve it while scanning module config, and
both store it on `ModuleDescriptor`. `GlobalGraph.moduleConfigList` then carries
that name into `LoadUnitFactory`; neither `LoaderFS` nor `LoaderFactory` resolves
`unitName`. Manifest reference/descriptor names for the same unit path are
validated for consistency.

**Format targets differ.** The `module` format runs on Cloudflare workerd. The
`service-worker` format targets Web Service Worker / edge runtimes that expose a
global `addEventListener('fetch')` — it is **not** a workerd target: workerd's
`nodejs_compat` (required for tegg's `AsyncLocalStorage`) only supports the
module-worker format, and `wrangler` rejects a service-worker-format script that
imports Node builtins (`Unexpected external import of "assert"…, no default
export`). The minimal `helloworld-service-worker` example intentionally demonstrates
only the deployable module-worker path; the classic format remains available through
the bundler and CLI for compatible hosts.
