# Wiki Log

Dates use the workspace-local Asia/Shanghai calendar date.

## [2026-07-20] docs | simplify the standalone service-worker example

- sources touched: `examples/helloworld-service-worker/{README.md,package.json,.gitignore,wrangler.jsonc,fetch-event.ts,worker-sw.ts,run-sw.mjs}`
- pages updated: `wiki/packages/egg-bundler.md`, `wiki/packages/service-worker.md`, `wiki/log.md`
- note: Reduced the minimal example to its two actual entry points: `main.ts` for the Node HTTP server and `worker.ts` for the deployable Cloudflare module worker. Removed the redundant unbundled fetch-event shim and the classic-service-worker Node harness, plus their npm scripts and generated-output ignore. The bundler's public `service-worker` format remains supported; it is no longer presented as a primary runtime path in this minimal example. Also removed stale references to the deleted hand-written `bundle-cf.mjs`/`bundle-sw.mjs` scripts.

## [2026-07-20] fix+feature | standalone bundle dynamic-load parity, DAL fix, egg-bin bundle CLI

- sources touched: `tegg/core/loader/src/impl/ModuleLoader.ts`, `tegg/plugin/dal/src/lib/DataSource.ts`, `tegg/standalone/service-worker/src/{index.ts,ServiceWorkerApp.ts}`, `tegg/standalone/service-worker/tsdown.config.ts`, `tegg/standalone/service-worker-controller/package.json`, `tools/egg-bundler/src/lib/importMetaPatch.ts`, `tools/egg-bin/src/commands/bundle.ts`, `examples/helloworld-service-worker/*`
- pages updated: `wiki/packages/egg-bundler.md`, `wiki/log.md`
- note: Fixed the standalone bundle's dynamic-module-loading gap so it aligns with the egg app bundle: `ModuleLoader.createModuleLoader` now reuses the manifest's decorated files from `globalThis.__EGG_BUNDLE_MANIFEST__` in bundle mode, so DAL's multiInstance `getObjects` (which does `LoaderFactory.createLoader(unitPath).load()`) no longer globs non-decorated files (an egg plugin's `app.ts`) missing from the bundle map. Root cause traced through `createByDynamicMultiInstanceClazz → getObjects → ModuleLoader.load`; the egg app avoided it by bundling all `fileDiscovery` files + a `ManifestLoaderFS`, which standalone (decorated-only) lacked. Also fixed DAL's `DataSource.getObjects` to return before loading a module with no `dataSource` config. This lets a standalone service-worker bundle include teggDal without `excludeModules`. Added `egg-bin bundle` support for standalone targets (selected by `--entry`/`--target standalone`; `--framework` names an app package exporting `loadMetadata`, e.g. `@eggjs/service-worker` which now exports it) — the example replaces its hand-written bundle-cf.mjs/bundle-sw.mjs with `egg-bin bundle`. Also cleared CI build blockers: isolatedDeclarations types on `importMetaPatch` + `ServiceWorkerApp.loadMetadata`, and unplugin-unused deps (dropped unused `@eggjs/service-worker-runtime` from the controller, ignored the scan-only `@eggjs/service-worker-controller` on the host). Verified: `ut run build` green; both module + service-worker formats bundle via the CLI and run on Node + workerd (teggDal included) — `/hello` + `/mcp/calc/stream` 200.

## [2026-07-19] refactor | standalone service worker Cloudflare bundle → injection-based seam

- sources touched: `tools/egg-bundler/src/lib/StandaloneWorkerBundler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `packages/typings/src/global.ts`, `examples/helloworld-service-worker/{worker.ts,bundle-cf.mjs,README.md,.gitignore}`
- pages updated: `wiki/packages/egg-bundler.md`, `wiki/packages/service-worker.md`, `wiki/log.md`
- note: Reworked `StandaloneWorkerBundler` from synthesizing the host entry (hardcoded `export default { fetch }`) to an INJECTION seam. The user now authors a plain, locally-runnable `worker.ts` (`new ServiceWorkerApp(dir)` + `export default { fetch }` or `addEventListener`); the bundler takes an `entry` path + `format` ('module' | 'service-worker') and prepends a scanned-imports + manifest prelude to a build-managed copy beside `worker.ts` (so relative imports/`import.meta` resolve unchanged, no build-only specifier leaks). `StandaloneApp.init` falls back to `globalThis.__EGG_BUNDLE_MANIFEST__` (declared in `packages/typings/src/global.ts`, mirroring `__EGG_BUNDLE_MODULE_LOADER__`) when no `manifest` option is given, so one `worker.ts` runs bundled (global manifest) and unbundled (runtime fs scan). ESM wrapper re-exports the entry default (module worker) or runs it for side effects (service-worker). Also corrected a long-standing mislabel: `@eggjs/egg-bundler`'s `@utoo/pack` engine is **Turbopack**, not mako; it only emits CJS (`OutputType` = standalone|export), which is why worker output needs the thin ESM wrapper (source-confirmed at tag `utoopack-v1.4.17`). Verified on Node and workerd (`wrangler dev`): example `GET /hello/` + `POST /mcp/calc/stream` both 200.

## [2026-07-15] feature | fetch-host `@HTTPCookies` (fetch-native cookies)

- sources touched: `tegg/standalone/service-worker-controller/src/http/{ServiceWorkerCookies.ts,FetchHTTPMethodRegister.ts}`, `tegg/standalone/service-worker-controller/src/index.ts`, `tegg/standalone/service-worker/test/{ServiceWorkerApp.test.ts,fixtures/hello-app/EdgeController.ts}`
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: Added `@HTTPCookies()` to the fetch host — `FetchHTTPMethodRegister` gains the `HTTPParamType.COOKIES` branch binding a fetch-native `ServiceWorkerCookies` (`@eggjs/cookies`-compatible `get`/`set`; Set-Cookie attrs path/domain/expires/maxAge/httpOnly/secure/sameSite/partitioned/priority/overwrite) that reads the `Cookie` header + writes `Set-Cookie` onto `ctx.responseHeaders`. Previously the fetch host had no COOKIES param branch (threw "unsupported param type"). Unsigned by design (edge-clean; not `@eggjs/cookies`, which has app coupling + heavy deps) — signing/encryption are not implemented; a host that needs them injects `@eggjs/cookies`. Users annotate `@HTTPCookies() cookies: Cookies` with the `Cookies` type from `@eggjs/tegg`; `ServiceWorkerCookies` is the internal impl.

## [2026-07-15] fix | fetch-host streaming keepalive via tee + context preDestroy

- sources touched: `tegg/standalone/service-worker-controller/src/http/FetchEventHandler.ts`
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: Reworked streaming keepalive from the BackgroundTaskHelper passthrough to `stream.tee()` + a request-context `preDestroy` (`EggContextLifecycleUtil.registerObjectLifecycle`) that awaits the monitor branch draining — no `backgroundTask.timeout` cap, so a legitimately long stream (SSE) is never cut short.

## [2026-07-14] feature | fetch-host MCP config-selected transport provider

- sources touched: `tegg/standalone/service-worker-controller/src/mcp/{ServiceWorkerMcpRouter.ts,types.ts}`, `tegg/standalone/service-worker/test/MCP.test.ts`
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: `config.mcp.transport` selects the fetch-host MCP transport per app: the built-in `'web'` (web-standard streamable, default) or a host-registered alternative by name via `ServiceWorkerMcpRouter.registerTransport(name, provider)`. The selected provider fully owns the server's transport (mutually exclusive with the built-in), so a host can swap in an alternative transport (e.g. a node-based SSE `/sse`+`/messages` + streamable) WHOLESALE via config — no router fork, no facade `mcp` option, no IoC override, no module swap; node:http stays in the registering host. Registry is `TeggScope`-scoped per app (mirrors `EggMcpRouter.hooks`); unknown name falls back to built-in. `McpTransportProvider` gets an `McpServerMountContext` (router, live registration, serverName/basePath, shared authenticate/createServerHelper/selectMiddlewares/compose). Built-in path shares `#mountStreamable` + `#createServerHelper`.

## [2026-07-14] behavior | service-worker standalone: single config surface + capability-object seam

- sources touched: `tegg/standalone/standalone/src/{StandaloneApp.ts,main.ts}`, `tegg/standalone/standalone/README.md`, `tegg/standalone/service-worker/src/ServiceWorkerApp.ts`, `tegg/standalone/service-worker-controller/src/{mcp/ServiceWorkerMcpRouter.ts,types.ts}`, `tegg/standalone/service-worker/test/{ServiceWorkerApp.test.ts,MCP.test.ts,fixtures/hello-app/*}`
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: `StandaloneApp` exposes the entry app module's `module.yml` (the module scanned from `baseDir`) as the framework-owned app-wide `config` inner object — the single user config surface, with NO programmatic override (subsystems read their slice, e.g. `config.backgroundTask.timeout`, `config.mcp.*`). Capability objects are `@InjectOptional()` inner objects supplied via the generic `innerObjectHandlers` seam, each defaulting when absent: `mcpAuthHandler` (absent → allow-all), `fetchContextFactory`, `errorResponseMapper`. So `ServiceWorkerApp` has no bespoke options — `ServiceWorkerAppOptions` aliases `StandaloneAppOptions`. Removed the earlier `mcp` facade option + `mcpTransportOptions` inner object; DNS-rebinding options move to `config.mcp`. Tests use `module.<env>.yml` fixtures (via `env`) for per-app mcp config and `innerObjectHandlers` for auth.

## [2026-07-14] package | service-worker framework-module auto-discovery (drop hand-ordered frameworkDeps)

- sources touched: `tegg/standalone/service-worker-runtime/src/StandaloneEggObjectFactory.ts`, `tegg/standalone/service-worker/src/{ServiceWorkerApp.ts,index.ts}`, `tegg/standalone/service-worker/test/ServiceWorkerApp.test.ts`
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: `ServiceWorkerApp` hand-listed `service-worker-runtime` + `-controller` as explicit `frameworkDeps` in a fixed order (with a long comment about the order being load-bearing), because single-root auto-discovery from the controller root threw `EggPrototypeNotFound: eggObjectFactory in LOAD_UNIT:serviceWorkerRuntime` when the runtime module scanned second. Root cause (reproduced by pointing frameworkDeps at one controller root): `StandaloneEggObjectFactory extends EggObjectFactory` omitted `name`, so it registered as `standaloneEggObjectFactory` and did NOT satisfy `ServiceWorkerRunner`'s by-name `@Inject() eggObjectFactory` locally — the inject fell back to the global PUBLIC `eggObjectFactory` in `@eggjs/dynamic-inject-runtime`, whose availability depended on module scan order. NOT a topological-sort bug (the coupling was a name mismatch forcing reliance on a global proto). Fix: pin `name: 'eggObjectFactory'` on `StandaloneEggObjectFactory` → local, order-independent resolution. That unblocked the upstream reference structure (`standalone-next`): `ServiceWorkerApp` now uses a single frameworkDep = its own package root (`path.join(__dirname, '..')`), auto-discovering runtime + controller via the node_modules eggModule convention; removed the manual `import.meta.resolve` list + the stale comment. Also dropped `export * from '@eggjs/service-worker-controller'` from the facade `index.ts` (align to reference — only exports ServiceWorkerApp; the one SW test using `FetchEventImpl` now imports it from the controller package). Did NOT convert composition→`extends StandaloneApp` (our facade is richer: `serve()` node:http bridge, narrow public surface). Green: SW suite (21) + standalone + controller + tegg (142 passed, only pre-existing dal/MySQL skips); typecheck/oxfmt clean.

## [2026-07-14] concept | single PUBLIC copy of app-scoped compat protos (dedup)

- sources touched: `tegg/plugin/tegg/src/lib/{ModuleHandler,EggAppLoader}.ts`
- pages updated: `wiki/concepts/tegg-module-plugin.md`, `wiki/log.md`
- note: The `() => app[name]` APP-scoped compat protos (router / logger / runtimeConfig / ...) were DUPLICATED — a PUBLIC copy in the APP load unit (for business modules) plus a PRIVATE copy in the inner-object load unit (for inner objects), the PRIVATE-ness chosen to avoid two PUBLIC copies colliding. Verified empirically that business modules resolve the inner-object load unit's PUBLIC protos fine (whole tegg/controller/aop/eventbus/schedule/service-worker suite green, incl. MultiApp, with the APP-unit copy removed), so consolidated to ONE PUBLIC copy in the inner-object load unit: `ModuleHandler` feeds `buildAppSingletonCompatClazzList()` (now default PUBLIC) and `EggAppLoader.load()` no longer prepends `buildAppSingletonCompatClazzList()` — it provides only the CONTEXT-scoped compat + `moduleConfigs`. The `accessLevel` param on `buildClazz`/`buildAppLoggerClazz`/`buildAppSingletonCompatClazzList` existed only to build the PRIVATE copy and was removed (compat protos are always PUBLIC). `EggCompatibleProtoImpl` still honors the descriptor accessLevel (left as-is, just always PUBLIC now). `moduleConfigs` stays the one explicit PRIVATE provided inner object. Pre-existing `tegg-config/DuplicateOptionalModule.test.ts` failure is unrelated (fails on baseline too; asserts a `moduleReferences` list).

## [2026-07-13] concept | egg HTTP register via LoadUnitInstance hook + inner-object instantiation is complete

- sources touched: `tegg/plugin/controller/src/lib/impl/http/EggHTTPControllerRegistrar.ts` (new, merges the former `EggHTTPRegisterProvider` + a short-lived separate `EggHTTPRegisterHook`), `tegg/plugin/controller/src/app.ts`
- pages updated: `wiki/concepts/tegg-module-plugin.md`, `wiki/workflows/local-ci.md`, `wiki/log.md`
- note: Replaced the egg controller boot's manual `httpRegisterProvider.doRegister(...)` (and its by-name `getPrototype` resolve of the provider) with a container-native trigger. `EggHTTPControllerRegistrar` is one class that (a) plugs the HTTP register creator into the factory via `@LifecyclePostInject` and (b) is a `@LoadUnitInstanceLifecycleProto` whose `postCreate` mounts all collected controllers priority-sorted onto `app.router` when the `CONTROLLER_LOAD_UNIT` (`app/controller`, egg's last controller-bearing load unit) instance is created — `postCreate` fires per instance so it filters on `instance.loadUnit.type`. The boot still resolves `rootProtoManager` (teggRootProto middleware reads `ctx.app.rootProtoManager`, non-DI). Two durable findings recorded: (1) inner-object instantiation is NOT reachability-gated — `InnerObjectLoadUnitBuilder#buildProtoGraph` returns EVERY scanned proto (graph is ordering/cycle/missing-dep only), so "a scanned inner object wasn't instantiated" means the scan input was stale, not graph pruning; (2) the failure that first looked like graph gating was a stale fixture `.egg` compile-cache — its scan manifest omitted the newly-added hook file, so acl-app (controllers only in `app/controller`, no module controllers) 404'd while module-having apps passed. Clearing `.egg` under the fixtures fixed it; both the separate-hook and merged-registrar forms then pass. No merge for standalone (lazy, no `CONTROLLER_LOAD_UNIT`; trigger lives in `FetchEventHandler.doInitRoutes` which also drives MCP + the fetch-router snapshot) or egg MCP (`MCPControllerRegister.register()` mounts immediately, no deferred doRegister). Follow-up (same day): reverted `RootProtoManager` from an egg inner object to an app-mounted APP compat proto. It is now host-agnostic pure logic with NO proto decorator in controller-runtime; the fetch host applies `InnerObjectProto(PUBLIC)(RootProtoManager)` imperatively in its `runtimeProtos` barrel and injects it, while the egg boot mounts `new RootProtoManager()` on `app.rootProtoManager` before `moduleHandler.ready()` so it becomes a `() => app[name]` compat proto (like `app.mcpRouter`) injected via `@EggQualifier(EggType.APP)` in `EggHTTPControllerRegistrar`, and still backs the plain `teggRootProto` middleware. This dropped the last boot-hook `#resolveInnerObject` (helper deleted) and, being vestigial, `rootProtoManager` was removed from `ControllerLoadUnitHook` + the `ControllerRegister.register(loadUnit?)` interface param. Regression green: controller full suite (incl. acl/priority/module/multi-app) + `mcp-tegg-register` + service-worker (92 tests); typecheck/oxfmt clean; dal fails only on missing MySQL.

## [2026-07-13] concept | inner objects inject app properties via egg compat protos

- sources touched: `tegg/plugin/tegg/src/lib/{ModuleHandler,EggAppLoader,EggCompatibleProtoImpl}.ts`, `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/controller/src/{app.ts,lib/impl/http/EggHTTPRegisterProvider.ts}` (+ deleted `EggHTTPControllerRegister.ts`), controller-runtime `ControllerModule.ts` fold-in
- pages updated: `wiki/concepts/tegg-module-plugin.md`, `wiki/log.md`
- note: A controller/tegg refactor arc. (1) Folded the `Egg*` inner-object shell subclasses into the runtime base classes (decorators moved onto `RootProtoManager`/`ControllerRegisterFactory`/`ControllerLoadUnitHook`/`ControllerPrototypeHook`; hosts re-export the bases). (2) Made the egg HTTP register a container citizen: `EggHTTPRegisterProvider` (@InnerObjectProto) replaces the static-TeggScope-slot `EggHTTPControllerRegister`, mirroring the fetch host's provider. (2b, commit `0e59ce453`) Did the same for the egg MCP register: mount the per-app `EggMcpRouter` on `app.mcpRouter` in the controller boot (it needs the live `app`, so it is still built imperatively) so its compat proto reaches inner objects; an `EggMCPRegisterProvider` optional-injects `@EggQualifier(EggType.APP) mcpRouter` and plugs in the MCP creator. With both HTTP and MCP on providers, the imperative enqueue/drain bypass `ControllerRegisterDefaults` (and `ControllerRegisterFactory.applyDefaultRegisters`) is DELETED — egg and standalone now differ only in their router/mcpRouter implementations. Added the first running egg MCP-controller test (`mcp-proxy/test/mcp-tegg-register.test.ts`: teggController + mcpProxy + a tegg `@MCPController`, asserts `app.mcpRouter` mounted and `GET /mcp/stateless/stream` → 405). (3) The load-bearing change: instead of ModuleHandler hand-providing `logger`/`runtimeConfig`/`router` as PRIVATE `ProvidedInnerObjectProto`s, it now feeds `EggAppLoader.buildAppSingletonCompatClazzList(PRIVATE)` into the inner-object graph via `InnerObjectLoadUnitBuilder.addCompatibleClazzList`, so inner objects inject app properties through the same `() => app[name]` compat protos business modules use. Enablers/gotchas: `EggCompatibleProtoImpl` now honors the descriptor accessLevel (was hardcoded PUBLIC) so the inner-unit copies are PRIVATE and don't collide with the app load unit's PUBLIC copies; CONTEXT-scoped compat protos are excluded (inner objects are singletons); compat protos are fed AFTER scanned inner objects and skip name clashes (inner object wins); `moduleConfigs` stays an explicit provided instance (blacklisted in EggAppLoader + wants a `ModuleConfigs` wrapper); an app property whose name is also a ctx property (`router`) needs `@EggQualifier(EggType.APP)` because `EggQualifierProtoHook` stamps a plain inject CONTEXT-first. Regression green (tegg/controller/mcp-client/aop/eventbus/config/schedule/service-worker) modulo the pre-existing 5000ms-suite-default flaky (`ControllerMetaManager` boot-error, `MultiApp` isolate — both pass in isolation) and dal tests needing MySQL.

## [2026-07-10] package | four-package controller layering (runtime library + per-host plugins)

- sources touched: `tegg/core/controller-runtime/*` (new), `tegg/standalone/service-worker-controller/*` (new), `tegg/plugin/controller/src/{index.ts,lib/ControllerModule.ts}`, `tegg/standalone/service-worker/src/{ServiceWorkerApp.ts,index.ts,ControllerModule.ts}` (moved)
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: Split the controller stack into four packages mirroring the egg/standalone host boundary. Extracted the egg-free host-agnostic runtime into `@eggjs/controller-runtime` — a plain LIBRARY, NOT an eggModule (it defines the base register classes, collect-only `MCPControllerRegister`, `McpRouter`/`Router` abstractions, `MCPServerHelper`, and the controller inner-object prototypes, but is never scanned). The scanned eggModule stays a HOST package: the egg host's `teggController` plugin (`@eggjs/controller-plugin`) and the fetch host's `serviceWorker` module (extracted into a new `@eggjs/service-worker-controller` package) each re-export the runtime's protos into their own module (`ControllerModule.ts`, collected by `LoaderUtil.loadFile`). `@eggjs/service-worker` is now just the `ServiceWorkerApp` host facade, depending on the egg-free runtime + the fetch controller package — never on the egg plugin. Package-identity module binding (the C2/C3 reconcile) keeps the egg host promoting its own `teggController`. Regression green across controller/service-worker/mcp-proxy/example/MultiApp; typecheck clean; the runtime and fetch-controller packages carry no `egg` dependency.

## [2026-07-10] package | host-agnostic MCP register via McpRouter boundary

- sources touched: `tegg/plugin/controller/src/lib/impl/mcp/{McpRouter,EggMcpRouter,MCPControllerRegister}.ts`, `tegg/plugin/controller/src/{app.ts,lib/ControllerModule.ts}`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/service-worker/src/mcp/{ServiceWorkerMcpRouter,MCPRegisterProvider}.ts`, `tegg/plugin/mcp-proxy/src/{app,index}.ts`
- pages updated: `wiki/packages/service-worker.md`, `wiki/log.md`
- note: Fixed the C4 host-boundary leak — the MCP controller register mixed record collection with egg-specific transport and the egg host threaded its `Application` into the module inner-object DI graph as a PRIVATE `eggApp` provided object. Extracted a `McpRouter` transport boundary: the shared `MCPControllerRegister` now only collects tool/resource/prompt records and calls `mcpRouter.registerServer(reg)`; egg node-HTTP transport moved to `EggMcpRouter` (built in `app.ts` with `app`), SW fetch transport to `ServiceWorkerMcpRouter`. Both provide the `mcpRouter` DI name (host plugins never coexist). `eggApp` provided object removed from `ModuleHandler`; `EggControllerRegisterFactory` dropped its host generic/injection. `MCPServerHelper` was already host-agnostic and is unchanged. Regression green (controller/service-worker/mcp-proxy/example/MultiApp) modulo a pre-existing controller boot-error test that only times out under the 5000ms suite-default and dal tests that need MySQL.

## [2026-06-28] workflow | record egg-bin Windows shell probe hotspot

- sources touched: `tools/egg-bin/bin/run.js`, `tools/egg-bin/test/fixtures/my-egg-bin/bin/run.js`, PR #6014 CI logs
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/workflows/egg-bin-windows-shell-probe.md`
- note: Recorded the PR #6014 investigation that found hosted-Windows `test-egg-bin` slowness was oclif's synchronous shell probe when spawned children lacked `SHELL`. The final code keeps only the Windows `SHELL` preset before dynamically importing `@oclif/core`; temporary timing and runner-diagnostic code was removed from the PR. Latest single Windows bin job passed in about 3m06s with `test/commands/test.test.ts` around 48.8s and `test/my-egg-bin.test.ts` around 8.5s.

## [2026-06-28] package | snapshot bundler lazy-externalizes undici + urllib by default (PR #6011)

- sources touched: `tools/egg-bundler/src/lib/prelude.ts`, `tools/egg-bundler/test/snapshot-lazy-external.test.ts`, `tools/egg-bundler/test/snapshot-lazy.realbuild.test.ts`
- pages updated: `wiki/packages/egg-bundler.md`, `wiki/log.md`
- branch: `feat/snapshot-default-lazy-undici-urllib` (off `next`)
- change: Added `undici` + `urllib` to `DEFAULT_SNAPSHOT_LAZY_MODULES` so an app gets a serializable V8 snapshot without listing them in `egg.snapshot.lazyModules`. Egg builds its HttpClient (urllib → undici) during boot, and undici's llhttp `WebAssembly` + `HTTPParser` cannot be snapshot-serialized. As npm packages they would be inlined; listing them forces them external (`Bundler` adds lazy ids to the externals map) so the prelude member-proxy stub is used at build and the real module is required on restore.
- history note: the PR originally (off the older `next`) shipped a bespoke per-export forwarder in `__makeLazyExt` to make `class HttpClient extends urllib.HttpClient` survive the build→restore boundary. While the PR was open, #6003 landed on `next` and rewrote `__makeLazyExt` into a general **access-path-recording member-proxy** (`makeMember`) that already handles `class X extends pkg.Klass` / `DataTypes.INTEGER(11).UNSIGNED` plus `ownKeys`/`getOwnPropertyDescriptor` via `__EXTERNAL_EXPORTS`. The PR was rebased onto that and **reduced to just the default-list addition** (forwarder dropped as superseded). Note `makeMember`'s `protoProxy` has only a `get` trap (no `getPrototypeOf`), so `instanceof RealBase` on a snapshot-frozen subclass is `false` — methods/fields/super() work, identity-by-prototype does not.
- verification: unit test asserts undici+urllib in the default list; new real `@utoo/pack` build test exercises a **forced-external npm package** `class Sub extends pkg.Base` across the build-stub / restore-real boundary in one process (upstream only realbuild-tested the `node:http` builtin). 28 lazy/realbuild tests green; tsgo + oxlint clean. Pre-existing macOS `ManifestLoader`/`EntryGenerator` tmpdir-symlink failures unrelated.

## [2026-06-27] concept | fix concurrent-import race in multi-app boot (oxc-node PR #5965)

- sources touched: `packages/utils/src/import.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- note: `tegg/plugin/tegg/test/MultiAppParallel.test.ts` ("…under concurrent boot") flaked ~12% (tsx) / ~24% (oxc-node) on macOS CI with `Can not find plugin watcher` or `Cannot convert undefined or null to object`. NOT caused by the tsx→oxc-node switch (both transpilers flake). Root cause: under `describe.concurrent`, multiple app loaders call `importModule()` on the same `.ts` module simultaneously; the transpile loaders recompile per-`import()` (tsx appends `?<ts>`, defeating Node's dedup) so a concurrent first-load can return a namespace whose `default` is `undefined` → empty framework `config/plugin` (watcher loses its `path`) or `Object.getOwnPropertyNames(undefined)` in `loadExtend`. Fix: `importModule` shares one in-flight `import()` per URL. 40/40 green under both transpilers after; full suite stays 527 files / 3430 tests, 0 failures. Heisenbug (instrumentation masks it); the `.egg/manifest.json` read/write race was a red herring. Recorded as root cause #5 on the concept page.

## [2026-06-27] workflow | CI surfaces single-run parallelism metrics for the isolate:false suite

- sources touched: `vitest.config.ts`, `.github/workflows/ci.yml`, `scripts/ci-test-benchmark/{index,vitest-summary,report,cli,fs,environment}.js`, `benchmark/ci-test/README.md`, `.gitignore`, `packages/supertest/test/supertest.test.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/workflows/ci-parallel-test-metrics.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- branch: `feat/ci-parallel-metrics` (off `feat/tegg-multiapp-isolation`)
- note: The full suite already runs `pool:threads` + `isolate:false` (full parallelism, made safe by tegg `TeggScope`). This change instruments the existing **test gating job** to show _how parallel it actually ran_, without touching gate semantics. `vitest.config.ts` adds a `json` reporter **only when `CI` is set** (writes `benchmark/ci-test/ci-run/vitest-results.json` as a side effect of the gating `ut run ci`; default console reporter preserved). A new `Report parallelism metrics` step (`if: always()`) runs the existing `ci-test-benchmark` harness in a new `--report-only --vitest-json <path>` mode, which now computes **avg/peak concurrency, parallel efficiency, and critical path** via a concurrency-timeline sweep over per-file `startTime`/`endTime`, and appends the report to `$GITHUB_STEP_SUMMARY`. Key gotcha found and fixed: the step calls `node scripts/ci-test-benchmark.js` **directly**, because `ut run <script> -- …` re-serializes forwarded args into a `sh -c` string without re-quoting, so parentheses in `--name` throw `syntax error near unexpected token '('`. Honesty caveat baked into the report footnote (corrected after adversarial review): Vitest 4 derives a file's interval from test-level timings, so spans cover test bodies + per-test beforeEach/afterEach but **exclude suite-level beforeAll/afterAll (egg app boots) and module transform/import** — avg/efficiency are lower bounds; peak concurrency is the robust signal. Worker ceiling mirrors the config (Windows caps at 2). Fully-skipped files are dropped from the timeline.

Full **isolate:false suite validated GREEN** under CI-faithful parallelism (`--maxWorkers 4`, services up): **526 files / 3425 tests pass, 0 failures**. The only two failures seen during validation were non-isolation: (1) `@eggjs/supertest` "should handle connection error" asserted exact `ECONNREFUSED` on hardcoded `127.0.0.1:1234`, which collides with a local proxy (Surge) → hardened to accept the connection-error family (`ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up`); (2) the pre-existing `@eggjs/multipart` upload load-flake (fails under isolate:true too) surfaces only when a 12-core box over-saturates beyond CI's 4 vCPUs — out of scope, mitigated by CI-faithful worker count. Validated end-to-end: edited config loads in real vitest (both reporters, JSON at the configured path), harness math cross-checked independently, `--report-only` exits 0 on missing JSON, step-summary append is cross-platform, oxfmt/oxlint clean.

## [2026-06-22] package | egg-bundler CJS/ESM require interop fixed upstream in @utoo/pack (EGG-69)

- sources touched: `pnpm-workspace.yaml`, `tools/egg-bundler/src/lib/Bundler.ts`, `tools/egg-bundler/test/Bundler.test.ts`, `tools/egg-bundler/test/cjsEsmInterop.realbuild.test.ts`
- note: Bundled cnpmcore crashed at runtime with `<path>/tsconfig.json is malformed JSON5.parse is not a function`. Root cause: older `@utoo/pack` (Turbopack, target node) resolved a CJS `require('json5')` to json5's ESM `module` entry (`dist/index.mjs`, default-only), so `commonJsRequire` returned the `{ __esModule, default }` namespace and `JSON5.parse` was undefined. This is now **fixed upstream** (utooland/utoo#3185): `@utoo/pack` >= 1.4.16 resolves a CJS `require()` of such a dual package to its CommonJS `main`, matching Node's own CommonJS resolution. The earlier in-repo workaround (a post-build patch of `_turbopack__runtime.js` that unwrapped the lone `default`) is **removed** in favour of the upstream fix; the catalog `@utoo/pack` range is bumped to `^1.4.16`. Verified by a real `@utoo/pack` build over a json5-shaped dual fixture (`main`+`module`, ESM exports only `default`) required from authored CJS via a named member: the bundled worker runs the CJS implementation (`cjs:ok`) with no crash, confirming `require('pkg').member` resolves like Node. NB: the internal registry (`registry.antgroup-inc.cn`) still tops out at 1.4.14 (which lacks the fix); the OSS repo/CI uses the public registry where 1.4.16 is available.

## [2026-06-20] concept | fix Windows-flaky session test (teardown close/load race)

- sources touched: `packages/core/src/lifecycle.ts`, `packages/egg/src/lib/egg.ts`, `packages/core/test/lifecycle.test.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- note: Windows CI flakily failed `@eggjs/session` `session.test.ts` with "app has been closed" / "Can't find viewEngine". Root cause: a still-loading `mm.app()` app/agent (load runs on `process.nextTick` as a `registerBeforeStart` hook) calls `Lifecycle.registerBeforeClose()` after `close()` already set `#isClosed`, directly in `egg.ts` `load()` or lazily via `coreLogger`→`createLoggers()` from `dumpTiming` / `_unhandledRejectionHandler`. The `assert(#isClosed === false)` threw, becoming a process unhandled rejection that `isolate:false` attributes to whatever file is running. Fix: `registerBeforeClose()` now skips (no-op + debug) when already closed instead of throwing; `load()` short-circuits when `lifecycle.isClosed` (removes the just-added unhandledRejection listener, returns); added `Lifecycle.isClosed` getter + regression test. Continuation of the isolate:false work (root cause #4 on the concept page).

## [2026-06-08] concept | vitest isolate:false state leaks diagnosed and fixed

- sources touched: `packages/utils/src/import.ts`, `packages/utils/test/snapshot-import.test.ts`, `plugins/mock/src/app/extend/application.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- note: Under root `pool:threads` + `isolate:false`, two realm-global leaks caused nondeterministic cross-file/cross-project failures. (1) `setSnapshotModuleLoader` left module-level `_snapshotModuleLoader`/`isESM=false` set (no-op test teardown), poisoning module resolution for later files (`Can not find plugin …`). (2) `mockContext()` reused `currentContext` from a different app, binding helpers to the wrong app config (surl/csrf failures). Fixed both at the source. Full Node-22 suite: 15 → 3 failing files (remaining 2 environmental MySQL/DNS; `multipart/file-mode` is a pre-existing load flake that also fails under `isolate:true`). Reproduce on Node 22/24 with a utoo install — not Node 26 / bare pnpm.

## [2026-06-03] workflow | document local CI artifact cleanup

- sources touched: `AGENTS.md`, `.github/workflows/ci.yml`, `package.json`, `tegg/core/loader/src/impl/ModuleLoader.ts`, `tegg/core/metadata/src/model/graph/GlobalGraph.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/workflows/local-ci.md`
- note: Recorded that local unit tests should run from clean sources, because stale built `dist/` files can be scanned alongside tegg TypeScript sources and trigger `duplicate proto` failures.

## [2026-05-10] package | extract shared LoaderFS package

- sources touched: `packages/loader-fs/src/index.ts`, `packages/loader-fs/package.json`, `packages/core/src/index.ts`, `packages/core/src/loader/file_loader.ts`, `packages/core/src/loader/egg_loader.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/core.md`, `wiki/packages/loader-fs.md`
- note: Moved the loader-facing `LoaderFS` / `RealLoaderFS` boundary into `@eggjs/loader-fs` while keeping `@eggjs/core` as a consumer and re-exporter.

## [2026-05-07] package | document core LoaderFS boundary

- sources touched: `packages/core/src/index.ts`, `packages/core/src/loader/loader_fs.ts`, `packages/core/src/loader/file_loader.ts`, `packages/core/src/loader/context_loader.ts`, `packages/core/src/loader/egg_loader.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/core.md`
- note: Recorded `LoaderFS` as the minimal loader filesystem boundary and `RealLoaderFS` as the default implementation for existing non-bundled behavior.

## [2026-05-06] package | sync bundled runtime support changes

- sources touched: `tools/egg-bundler/src/lib/ExternalsResolver.ts`, `packages/utils/src/import.ts`, `plugins/onerror/src/lib/onerror.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`, `wiki/packages/utils.md`, `wiki/packages/onerror.md`
- note: Recorded native optional platform package externalization, the opaque native dynamic import fallback used by bundled `importModule()`, and the local `@eggjs/onerror` implementation that avoids `koa-onerror` template reads.

## [2026-05-03] package | record egg bundler runtime path mapping

- sources touched: `tools/egg-bundler/src/lib/EntryGenerator.ts`, `tools/egg-bundler/docs/output-structure.md`
- pages updated: `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Documented that generated workers keep runtime outputDir separate from original app paths and key bundle module lookup by relKey, output absolute path, precomputed original app absolute path, and manifest resolveCache aliases.

## [2026-05-03] package | refine egg bundler docs

- sources touched: `tools/egg-bundler/src/lib/ManifestLoader.ts`, `tools/egg-bundler/src/lib/ExternalsResolver.ts`, `packages/core/src/lifecycle.ts`, `packages/egg/src/lib/start.ts`
- pages updated: `tools/egg-bundler/README.md`, `tools/egg-bundler/docs/output-structure.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Documented manifest auto-generation in metadataOnly mode and clarified root dependency external detection plus the `externals.inline` override.

## [2026-05-02] package | document egg bundler tooling

- sources touched: `tools/egg-bundler/src/index.ts`, `tools/egg-bundler/src/lib/Bundler.ts`, `tools/egg-bin/src/commands/bundle.ts`, `tools/egg-bundler/docs/output-structure.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Recorded the new `@eggjs/egg-bundler` package and its `egg-bin bundle` CLI surface after the bundler stack reached `next`.

## [2026-04-21] bootstrap | seed wiki schema and starter pages

- sources touched: `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/repository-map.md`, `wiki/workflows/docs-and-api-updates.md`
- note: Replaced handbook-style schema with an LLM wiki schema and added minimal wiki scaffolding.

## [2026-04-22] refactor | make AGENTS canonical shared instructions

- sources touched: `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/log.md`
- note: Moved shared coding-agent and wiki guidance into AGENTS.md, and reduced CLAUDE.md to a thin wrapper that imports it.

## [2026-04-26] package | add shared typings package notes

- sources touched: `packages/typings/package.json`, `packages/typings/src/index.ts`, `packages/typings/src/global.ts`, `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/typings.md`
- note: Recorded `@eggjs/typings` as the shared home for cross-package global typing contracts.

## [2026-06-27] api | formalize bundle/snapshot module-loader hooks

- sources touched: `packages/utils/src/import.ts`, `packages/utils/README.md`, `packages/utils/test/module-importer.test.ts`, `packages/utils/test/fixtures/module-importer-require-esm/run.mjs`, `packages/typings/src/index.ts`
- pages updated: `wiki/log.md`, `wiki/packages/utils.md`
- note: Documented the `__EGG_BUNDLE_MODULE_LOADER__` → snapshot loader (`setSnapshotModuleLoader`) → `__EGG_MODULE_IMPORTER__` → native priority as a formal contract (JSDoc on `BundleModuleLoader`/`ModuleImporter` + README). Added regression coverage for the V8 snapshot-restore path where `__EGG_MODULE_IMPORTER__ = require` loads ESM with no dynamic-import callback (inline sync-require test + spawned `node:vm` fixture). No load-semantics change — types/declarations already existed.

## [2026-07-04] architecture | tegg module plugin mechanism (both hosts)

- sources touched: `tegg/core/{types,core-decorator,loader,metadata,runtime}`, `tegg/core/aop-runtime`, `tegg/plugin/{tegg,aop,dal}`, `tegg/standalone/standalone`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Ported tegg#325's declarative module plugin core to next and completed it: @InnerObjectProto/@EggLifecycleProto five variants, host-agnostic InnerObjectLoadUnit instantiated before the business graph builds (restores the two-phase ordering so declarative graph build hooks land in-window), egg-host wiring (#325 left app mode out), and conversion of the built-in AOP/DAL/ConfigSource hooks to module plugins on both hosts. Runner renamed to StandaloneApp (no alias). Also fixed plugin/controller's middlewareGraphHook silent no-op (registered on a not-yet-created graph) on branch fix/controller-middleware-graph-hook.

## [2026-07-09] docs | correct tegg module plugin feeding rules

- sources touched: `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/plugin/{aop,config,dal}/src/app.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Corrected stale feeding-rule notes: inner object/lifecycle classes now arrive only through `ModuleDescriptor.innerObjectClazzList`; built-in AOP/DAL/ConfigSource hooks are discovered as normal module plugin classes rather than hard-fed lists, and duplicate inner-object proto ids are errors instead of class-level dedupe.

## [2026-07-09] docs | align tegg module plugin notes with review fixes

- sources touched: `tegg/plugin/aop/src/lib/AopContextHook.ts`, `tegg/core/aop-runtime/src/AopContextAdviceRegistry.ts`, `tegg/core/aop-runtime/src/LoadUnitAopHook.ts`, `tegg/plugin/dal/src/index.ts`, `tegg/plugin/dal/src/lib/DalModuleLoadUnitHook.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Replaced stale DAL source paths and updated the AOP note after `AopContextHook` moved to lifecycle-proto/inner-object registration backed by `AopContextAdviceRegistry`.

## [2026-07-12] architecture | harden module plugin discovery and lifecycle contracts

- sources touched: `tegg/plugin/config/src/app.ts`, `tegg/plugin/config/src/lib/ModuleScanner.ts`, `tegg/core/runtime/src/impl/InnerObjectLoadUnitInstance.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/core/metadata/src/model/graph/GlobalGraph.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Recorded plugin-aware module discovery, strict per-root versus nearest-framework reference dedupe, explicit GlobalGraph build state, reverse actual-creation teardown for inner objects, the shared inner-unit PRIVATE boundary, qualifier rules, and standalone migration details.

## [2026-07-13] architecture | make tegg startup failure cleanup atomic

- sources touched: `tegg/core/metadata/src/factory/LoadUnitFactory.ts`, `tegg/core/lifecycle/src/LifycycleUtil.ts`, `tegg/core/runtime/src/factory/{LoadUnitInstanceFactory,EggObjectFactory}.ts`, `tegg/core/runtime/src/impl/{EggObjectImpl,EggInnerObjectImpl,ModuleLoadUnitInstance}.ts`, `tegg/plugin/tegg/src/lib/AppLoadUnitInstance.ts`, `tegg/standalone/standalone/src/{EggModuleLoader,StandaloneApp}.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Made load-unit and instance creation single-flight and atomic on failure, restricted provisional instance lookup to the active DI chain, added failed-init rollback for standard business/inner EggObjects, made object/lifecycle teardown await and aggregate every cleanup, removed host-side partial-instance recovery, made standalone business-unit loading transactional, and defined StandaloneApp as single-use with terminal cleanup and re-entrant init-chain destroy rejection.

## [2026-07-13] decision | keep module-plugin lifecycle failures fail-fast

- sources touched: `tegg/core/metadata/src/factory/LoadUnitFactory.ts`, `tegg/core/runtime/src/factory/LoadUnitInstanceFactory.ts`, `tegg/core/runtime/src/impl/{EggObjectImpl,EggInnerObjectImpl,InnerObjectLoadUnitInstance}.ts`, `tegg/core/runtime/src/model/AbstractEggContext.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/{EggModuleLoader,StandaloneApp}.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Reverted the broad single-flight, failed-init rollback, and multi-phase error aggregation hardening because it was not required by module-plugin startup. Kept the core inner-object behavior: decorator-only self lifecycle dispatch, lifecycle registration, and reverse actual-creation teardown.

## [2026-07-13] decision | keep StandaloneApp lifecycle linear

- sources touched: `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/test/index.test.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Removed shared init/destroy promises, AsyncLocalStorage re-entry detection, concurrent lifecycle coordination, and partial-resource wrappers from StandaloneApp. Kept a linear single-use lifecycle, fail-fast teardown, scope release, and the required business-before-inner destroy order.

## [2026-07-13] architecture | give host logger a dedicated inner-unit input

- sources touched: `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/README.md`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Separated the host logger from generic `innerObjects` input. Standalone accepts logger only through its dedicated logger option and rejects `innerObjectHandlers.logger`; the builder still represents that value as an injectable provided proto internally.

## [2026-07-13] api | keep StandaloneApp runtime state private

- sources touched: `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/test/index.test.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Removed test-only getters for module references, module configs, load units, and load-unit instances. Tests now verify manifest, config, and teardown behavior through the public lifecycle; `scopeBag` remains available for owning-scope object resolution.

## [2026-07-13] behavior | reserve StandaloneApp framework inner objects

- sources touched: `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/test/index.test.ts`, `tegg/standalone/standalone/README.md`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Framework-owned `moduleConfigs`, `moduleConfig`, and `runtimeConfig` now take precedence over host input. Same-name host entries are silently ignored.

## [2026-07-13] refactor | keep logger specialization at the standalone API boundary

- sources touched: `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Kept logger as a dedicated Standalone public option, but removed the logger-specific builder channel. Each host now adds its logger to the complete provided-inner-object map before invoking the host-agnostic builder.

## [2026-07-05] package | standalone service worker (方案二 complete)

- sources touched: `tegg/plugin/controller`, `tegg/standalone/{service-worker-runtime,service-worker}`, `examples/helloworld-service-worker`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/service-worker.md`
- note: Completed the service-worker migration on top of the module plugin mechanism: made the controller plugin a dual-host module carrying its host-agnostic runtime under `lib/runtime/`, added the two service worker packages (fetch adapter + protocol-agnostic runtime), MCP stateless streamable HTTP via the SDK's web-standard transport (SDK >= 1.29 forbids stateless transport reuse — fresh server+transport per request), streaming-response lifecycle via BackgroundTaskHelper drain, unified `{ code, message }` errors, `mcpAuthHandler` auth extension point, and a runnable example. Gotcha recorded: frameworkDeps module scans must exclude `test/**` or framework test fixtures load as business modules.
