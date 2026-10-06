---
title: Tegg Module Plugin (declarative framework hooks)
type: concept
summary: How @InnerObjectProto/@EggLifecycleProto classes are collected into the InnerObjectLoadUnit and instantiated before the business graph builds, in both the standalone and egg hosts.
source_files:
  - tegg/core/core-decorator/src/decorator/InnerObjectProto.ts
  - tegg/core/core-decorator/src/decorator/EggLifecycleProto.ts
  - tegg/core/runtime/src/impl/InnerObjectLoadUnit.ts
  - tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts
  - tegg/core/runtime/src/impl/InnerObjectLoadUnitInstance.ts
  - tegg/core/runtime/src/impl/EggInnerObjectImpl.ts
  - tegg/core/runtime/src/impl/EggObjectImpl.ts
  - tegg/core/runtime/src/factory/LoadUnitInstanceFactory.ts
  - tegg/core/runtime/src/factory/EggObjectFactory.ts
  - tegg/core/runtime/src/impl/ModuleLoadUnitInstance.ts
  - tegg/core/lifecycle/src/LifycycleUtil.ts
  - tegg/core/metadata/src/factory/LoadUnitFactory.ts
  - tegg/standalone/standalone/src/StandaloneApp.ts
  - tegg/plugin/tegg/src/lib/ModuleHandler.ts
  - tegg/plugin/tegg/src/lib/AppLoadUnitInstance.ts
  - tegg/plugin/tegg/src/lib/EggModuleLoader.ts
  - tegg/plugin/tegg/src/lib/EggAppLoader.ts
  - tegg/plugin/tegg/src/lib/EggCompatibleProtoImpl.ts
  - tegg/plugin/tegg/src/lib/EggQualifierProtoHook.ts
  - tegg/plugin/aop/src/app.ts
  - tegg/plugin/aop/src/lib/AopContextHook.ts
  - tegg/core/aop-runtime/src/AopContextAdviceRegistry.ts
  - tegg/core/aop-runtime/src/LoadUnitAopHook.ts
  - tegg/plugin/config/src/app.ts
  - tegg/plugin/dal/src/index.ts
  - tegg/plugin/dal/src/lib/DalModuleLoadUnitHook.ts
  - tegg/plugin/controller/src/lib/impl/http/EggHTTPControllerRegistrar.ts
  - tegg/plugin/controller/src/lib/impl/mcp/EggMCPRegisterProvider.ts
  - tegg/core/controller-runtime/src/lib/MiddlewareGraphHook.ts
  - tegg/core/dynamic-inject-runtime/src
  - tegg/standalone/standalone/package.json
  - tegg/plugin/mcp-proxy/src/index.ts
  - tegg/standalone/service-worker-controller/src/http/FetchEventHandler.ts
updated_at: 2026-08-06
status: active
---

# Tegg Module Plugin

Ported from eggjs/tegg#325 (standalone-next) and completed for both hosts.
A plain eggModule package can provide framework extensions declaratively —
no host boot code:

- `@InnerObjectProto` — framework inner object (SingletonProto with
  `EGG_INNER_OBJECT_PROTO_IMPL_TYPE`); diverted by the loader into
  `ModuleDescriptor.innerObjectClazzList`, never into business load units.
- `@EggLifecycleProto` five variants (`LoadUnit` / `LoadUnitInstance` /
  `EggPrototype` / `EggObject` / `EggContext`) — a DI-capable hook object,
  auto-registered into the matching scope-aware LifecycleUtil by
  `InnerObjectLoadUnitInstance` and deregistered symmetrically on destroy.

## Two-phase ordering (the load-bearing constraint)

`GlobalGraph.create()` only adds nodes; `build()` adds inject edges and runs
`registerBuildHook` hooks once at its end. The graph accepts hooks only while
its state is `created`; registration after `build()` starts and repeated
`build()` calls fail explicitly. Both hosts therefore boot in this order:

1. scan modules → `GlobalGraph.create` (nodes only)
2. create AND instantiate the `InnerObjectLoadUnit` (own topologically
   sorted proto graph; cycle detection; hard error on missing non-optional
   deps unless host-provided) — hooks register here, including graph build
   hooks from `@LifecyclePostInject` (see `AopGraphHookRegistrar` and
   `ControllerGraphHookRegistrar`)
3. `build()` / `sort()` → business load units (EggPrototype/LoadUnit hooks
   observe them) → business instances
4. destroy in reverse creation order (inner unit last)

Hosts: `StandaloneApp.init()` (standalone) and `ModuleHandler.init()` via
`EggModuleLoader.initGraph()`/`load()` split (egg).

## Instantiation is complete, not reachability-gated

`InnerObjectLoadUnitBuilder#buildProtoGraph` topologically sorts and returns
**every** scanned inner-object proto; the graph is used only for ordering, cycle
detection, and missing-non-optional-dep errors — there is NO reachability
pruning. `ModuleLoadUnitInstance.init` then eagerly `getOrCreateEggObject`s all
of them, so every scanned `@InnerObjectProto` / lifecycle proto is instantiated
regardless of whether anything injects it. Corollary when debugging: "a scanned
inner object was not instantiated" is a **scan-input** problem (e.g. a stale
fixture `.egg` manifest — see `workflows/local-ci.md`), not graph gating.

## `@LoadUnitInstanceLifecycleProto` as an eager-registration trigger

Because inner objects are instantiated eagerly, a lifecycle proto's `postCreate`
is a reliable "run after this load-unit instance is created" signal. The Egg
controller plugin uses the same pattern for both protocols:
`EggHTTPControllerRegistrar` and `EggMCPRegisterProvider` register their
collectors in `@LifecyclePostInject`, then, as
`@LoadUnitInstanceLifecycleProto` objects, call the corresponding `doRegister()`
from `postCreate` when the `CONTROLLER_LOAD_UNIT` (`app/controller`, Egg's last
controller-bearing load unit) instance is created. `postCreate` fires for every
load-unit instance, so both providers filter on `instance.loadUnit.type`.

The standalone/service-worker host has no `CONTROLLER_LOAD_UNIT`; its HTTP and
MCP providers collect during startup and `FetchEventHandler.doInitRoutes()`
finalizes both once on the first fetch, before taking the router middleware
snapshot.

Graph hooks use the same declarative ownership at a different lifecycle point.
`ControllerGraphHookRegistrar` is an `@InnerObjectProto` whose
`@LifecyclePostInject` method attaches `middlewareGraphHook` to the current
`GlobalGraph`. Both controller hosts re-export that registrar from their scanned
`runtimeProtos.ts`, so middleware inject edges are installed after graph creation
and before `build()` without a host boot-hook call.

## Host-split wiring: a runtime class, two host treatments (`RootProtoManager`)

`RootProtoManager` (controller-runtime) is host-agnostic **pure logic and carries
NO proto decorator**. Each host wires it differently, which is why the decorator
does not live on the shared class:

- **Fetch host** uses it as a DI inner object: `service-worker-controller`'s
  `runtimeProtos` barrel applies `InnerObjectProto({accessLevel: PUBLIC})(RootProtoManager)`
  imperatively before re-exporting it (PUBLIC because `FetchEventHandler`, a
  business proto, injects it). Applying the decorator in the barrel — rather than
  a subclass — keeps a single class so the `RootProtoManager` type annotations at
  the inject sites match the decorated proto; tegg resolves the inject by the
  field name `rootProtoManager`.
- **Egg host** does NOT scan it (dropped from `controller-plugin`'s `runtimeProtos`).
  The boot hook mounts `new RootProtoManager()` on `app.rootProtoManager` BEFORE
  `moduleHandler.ready()`, so — exactly like `app.mcpRouter` — it becomes a
  `() => app.rootProtoManager` APP compat proto that inner objects inject via
  `@EggQualifier(EggType.APP)` (see `EggHTTPControllerRegistrar`), and it also
  backs the plain `teggRootProto` middleware (which cannot inject).

The former host-agnostic `ControllerLoadUnitHook` injection of `rootProtoManager`
was vestigial (`ControllerRegister.register()` ignored it — HTTP's is a no-op,
MCP mounts via its router) and was removed along with the param, so the shared
hook no longer depends on `rootProtoManager` being an inner object in every host.

## Feeding rules

- Module scanning is the single feed path: the loader diverts
  `@InnerObjectProto` / lifecycle proto classes into
  `ModuleDescriptor.innerObjectClazzList`.
- Egg (`ModuleHandler.instantiateInnerObjectLoadUnit`) and standalone
  (`StandaloneApp.#instantiateInnerObjectLoadUnit`) both iterate loaded
  module descriptors and call
  `InnerObjectLoadUnitBuilder.addInnerObjectClazzList()`.
- Built-in AOP / DAL / ConfigSource hooks are ordinary module plugin classes
  discovered through module references. There are no
  `AOP_INNER_OBJECT_CLAZZ_LIST` / `DAL_INNER_OBJECT_CLAZZ_LIST` hard-fed
  lists and no `moduleHandler.registerInnerObjectClazzList()` API.
- The builder does not silently dedupe classes: duplicate inner-object proto
  ids are hard errors. Package/path dedupe belongs to module reference
  discovery before descriptors are loaded.
- Host-provided instances (`innerObjects` / `innerObjectHandlers`) become
  `ProvidedInnerObjectProto`s. Hosts pass one complete object map to the
  builder; the builder does not special-case names such as `logger`. Standalone
  keeps provided objects PUBLIC (business modules may inject `logger`,
  `moduleConfigs`, etc.); the egg host passes PRIVATE for its base objects so
  they never pollute cross-unit resolution.
- Egg feeds app properties to inner objects through the egg **compat**
  mechanism, not a hand-provided list: `ModuleHandler` calls
  `builder.addCompatibleClazzList(EggAppLoader.buildAppSingletonCompatClazzList())`,
  so inner objects inject `router` / `logger` / `runtimeConfig` / ... via
  `() => app[name]` protos. (Standalone has no egg compat surface, so it provides
  its own `logger` / `moduleConfigs` through innerObjects; only the egg host uses
  compat for these.) Key points:
  - **This is the single copy, PUBLIC.** Business modules resolve app properties
    from this inner-object-load-unit copy too, so the APP load unit does NOT
    duplicate them — `EggAppLoader.load()` provides only the CONTEXT-scoped compat
    protos + `moduleConfigs`. (There used to be a second PRIVATE copy here plus a
    PUBLIC copy in the APP load unit; that duplication was removed.) The compat
    protos are inert `() => app[name]` data providers with no lifecycle, so
    feeding them into the inner unit (created first) doesn't break the "inner
    unit first / destroyed last" invariant.
  - **APP-scoped only** (`buildAppSingletonCompatClazzList` excludes
    CONTEXT-scoped compat protos): inner objects are singletons and cannot
    inject request-scoped objects.
  - **Fed AFTER scanned inner objects**, with `addCompatibleClazzList`
    skipping (not erroring on) a name a scanned inner object already claims —
    the inner object wins.
  - `moduleConfigs` is the ONE base object that stays an explicit provided
    instance: it is blacklisted in `EggAppLoader` (`APP_CLAZZ_BLACK_LIST`) and
    consumers want a `ModuleConfigs` wrapper, not the raw `app.moduleConfigs`
    map. `logger`/`router`/`runtimeConfig` now arrive via the compat protos.
- Injecting an app property whose name is ALSO a ctx property (e.g. `router`)
  needs `@EggQualifier(EggType.APP)`: `EggQualifierProtoHook` stamps an
  otherwise-plain inject with `EggType.CONTEXT` first (ctx wins), which a
  singleton inner object cannot inject. App-only names (`runtimeConfig`,
  `logger` — the latter is CONTEXT-blacklisted) are stamped APP automatically.
- Mount-then-compat is the idiom for making an imperatively-built host object
  injectable to inner objects: an object that genuinely needs the live `app`
  to construct (e.g. the controller plugin's `EggMcpRouter`, built in the boot
  hook) is assigned to an `app.<name>` property BEFORE the inner-object graph
  builds; it then becomes an app property with a compat proto, and an inner
  object injects it with `@EggQualifier(EggType.APP)` (optional when the mount
  is conditional). This is how the egg MCP register became a container citizen
  without threading the whole `app` into the DI graph — see the controller
  plugin's `EggMCPRegisterProvider`.
- A module plugin can extend such a host object declaratively too. The MCP proxy
  module's `MCPProxyHookRegistrar` is an `@InnerObjectProto`; it injects the Egg
  host's `mcpRouter` compat proto and adds `MCPProxyHook` in
  `@LifecyclePostInject`. Consequently the router's hook list is ordinary
  per-app instance state rather than a static scope-backed registry. The plugin
  must be discovered as an eggModule (normal `package` plugin configuration),
  so its decorated registrar is present in the module descriptor/manifest.

## Access and qualifier boundary

All module plugins contribute their inner objects to one shared
`InnerObjectLoadUnit`. `AccessLevel.PRIVATE` is the boundary between that
inner unit and business load units; it is not a plugin-isolation boundary.
Inner objects from AOP, DAL, config, or application module plugins may inject
one another intentionally.

Each decorated inner object receives a `DefineModuleQualifier` for the module
that defined it. When different modules define the same object name, callers
must select one with `@DefineModuleQualifier(...)`; an unqualified ambiguous
lookup fails with `MultiPrototypeFound`. Host-provided objects use `app` as
their default define-module qualifier. Keeping one inner unit is deliberate:
it permits framework plugins to collaborate while still hiding PRIVATE
objects from business modules.

## Standalone compatibility notes

- The deprecated `Runner` app class was replaced by `StandaloneApp` without
  an alias.
- `main(options.innerObjects)` is removed. A defined value fails with a clear
  migration error; `innerObjects: undefined` is ignored. Use
  `innerObjectHandlers` for the flat `main()` API or `StandaloneAppInit.innerObjects`
  for the low-level API.
- `logger` has one dedicated input: `StandaloneAppOptions.logger` or
  `StandaloneAppInit.logger`. Supplying `logger` through `innerObjectHandlers`
  or low-level `innerObjects` is rejected. `StandaloneApp` adds that validated
  value to its internal provided-object map, so it remains injectable by both
  framework hooks and business modules without a logger-specific runtime API.
- Standalone owns `moduleConfigs`, `moduleConfig`, and `runtimeConfig`.
  Host-provided entries with those names are silently ignored so the framework
  objects always win.
- `StandaloneApp` does not expose module references, configs, load units, or
  load-unit instances as mutable runtime state. Low-level callers interact
  through `init()` / `run()` / `destroy()` and may use the owning `scopeBag`
  when scoped object resolution is required.
- `runtimeConfig.name` and `runtimeConfig.env` normalize omitted values to
  empty strings because the `RuntimeConfig` contract requires strings.
- Standalone discovery includes the AOP, DAL, config, and dynamic-inject runtime
  modules by design. The dynamic-inject runtime supplies the canonical PUBLIC
  `eggObjectFactory`; it is found by scanning `@eggjs/standalone`'s own package
  root, not by recursively traversing a host framework's dependency tree.
  Manifest consumption reuses the captured references and avoids a second scan.
  AJV is not a built-in standalone/service-worker module; applications that need
  it include `@eggjs/ajv-plugin` explicitly in their selected module roots.
- DAL managers are inner objects. `app.mysqlDataSourceManager` and the DAL
  `./app` export are removed; inject `MysqlDataSourceManager` or resolve it
  through `getEggObjectFromName()` within the owning app scope.

## Startup failure semantics

- A `StandaloneApp` is single-use. Its linear lifecycle is `new` ->
  `initializing` -> `ready` -> `closed`; failed initialization unregisters the
  app scope and ends at `closed`. Retry means constructing a new app, not
  reusing partially initialized state. Concurrent init/destroy is not a
  supported lifecycle: calls made while initialization is active are rejected
  instead of being coordinated through shared promises.
- Creation is fail-fast. `LoadUnit`, `LoadUnitInstance`, standard `EggObject`,
  and inner `EggObject` initialization errors propagate directly; factories do
  not run compensating destroy lifecycles for partial initialization.
- `LoadUnitInstanceFactory` publishes an instance before `init()` because
  singleton construction and dependency injection must resolve the owning
  instance during initialization. There is no single-flight or recursive-create
  guard beyond the established factory map behavior.
- Destruction is also fail-fast. Lifecycle phases run in their defined order and
  the first failure stops later phases; errors are not aggregated across phases.
- Inner objects still destroy in reverse actual-creation order, and their
  lifecycle registrations are removed before their object destroy hooks run.
- `StandaloneApp.destroy()` is a linear, fail-fast teardown. It destroys
  business load-unit instances and load units in reverse order, then destroys
  the inner-object instance and load unit last. Scope registration is released
  in `finally`, without coordinating concurrent init/destroy calls.

## Semantics worth remembering

- `EggInnerObjectImpl` runs ONLY decorator-declared self lifecycle methods —
  hook-callback names (`postCreate`, `preDestroy`, `init`, ...) never double
  as self lifecycle.
- Cross-module ordering between lifecycle protos must be expressed as
  `@Inject` edges; implicit registration order is not guaranteed.
- `frameworkDeps` (StandaloneApp option) scans framework module packages
  ahead of app modules; app mode has no frameworkDeps — plugins enter via
  the egg plugin shell + eggModule scanning.
- Inference: hooks that truly capture egg-only resources
  (`EggQualifierProtoHook`, `EggContextCompatibleHook`) stay host-registered.
  `AopContextHook` is now an `@EggContextLifecycleProto` inner object and
  reads request-scope advice from `AopContextAdviceRegistry`.
