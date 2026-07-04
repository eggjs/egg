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
  - tegg/standalone/standalone/src/StandaloneApp.ts
  - tegg/plugin/tegg/src/lib/ModuleHandler.ts
updated_at: 2026-07-04
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
`registerBuildHook` hooks once at its end (late registration is silently
lost). Both hosts therefore boot in this order:

1. scan modules → `GlobalGraph.create` (nodes only)
2. create AND instantiate the `InnerObjectLoadUnit` (own topologically
   sorted proto graph; cycle detection; hard error on missing non-optional
   deps unless host-provided) — hooks register here, including graph build
   hooks from `@LifecyclePostInject` (see `AopGraphHookRegistrar`)
3. `build()` / `sort()` → business load units (EggPrototype/LoadUnit hooks
   observe them) → business instances
4. destroy in reverse creation order (inner unit last)

Hosts: `StandaloneApp.init()` (standalone) and `ModuleHandler.init()` via
`EggModuleLoader.initGraph()`/`load()` split (egg).

## Feeding rules

- Scanned modules feed automatically (`innerObjectClazzList`).
- Built-in framework hooks (AOP `AOP_INNER_OBJECT_CLAZZ_LIST`, DAL
  `DAL_INNER_OBJECT_CLAZZ_LIST`, ConfigSource) are hard-fed:
  standalone in `StandaloneApp`, egg via
  `moduleHandler.registerInnerObjectClazzList()` from the aop/dal plugin
  boots (configDidLoad; moduleHandler exists because those plugins depend
  on `tegg`).
- The builder dedupes by class: a package may be BOTH hard-fed and scanned
  as an eggModule (e.g. `@eggjs/dal-plugin` as a module dependency).
- Host-provided instances (`innerObjects` / `innerObjectHandlers`) become
  `ProvidedInnerObjectProto`s. Standalone keeps them PUBLIC (business
  modules inject `moduleConfigs` etc.); the egg host passes PRIVATE for its
  base objects (`moduleConfigs`/`runtimeConfig`/`logger`) so they never
  pollute cross-unit resolution.

## Semantics worth remembering

- `EggInnerObjectImpl` runs ONLY decorator-declared self lifecycle methods —
  hook-callback names (`postCreate`, `preDestroy`, `init`, ...) never double
  as self lifecycle.
- Cross-module ordering between lifecycle protos must be expressed as
  `@Inject` edges; implicit registration order is not guaranteed.
- `frameworkDeps` (StandaloneApp option) scans framework module packages
  ahead of app modules; app mode has no frameworkDeps — plugins enter via
  the egg plugin shell + eggModule scanning.
- Inference: hooks needing egg-only resources (`EggQualifierProtoHook`
  captures `app`; `EggContextCompatibleHook`/`AopContextHook` snapshot
  init products) intentionally stay host-registered.
