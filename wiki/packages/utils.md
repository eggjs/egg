---
title: Utils Package
type: package
summary: Shared utility package for Egg module loading, config/plugin helpers, and bundled module-loader integration.
source_files:
  - packages/utils/README.md
  - packages/utils/src/import.ts
  - packages/utils/test/bundle-import.test.ts
  - packages/utils/test/module-importer.test.ts
  - packages/typings/src/index.ts
  - packages/typings/src/global.ts
updated_at: 2026-06-27
status: active
---

# Utils Package

`@eggjs/utils` is a shared utility package used across Egg packages.

## Public Surfaces

- `getPlugins(options)`, `getLoadUnits(options)`, `getConfig(options)`, and
  `getFrameworkPath(options)` expose application/framework discovery helpers.
- `importModule(filepath, options)` and `importResolve(filepath, options)`
  centralize runtime module loading.
- `setBundleModuleLoader(loader)` registers the bundled runtime loader hook.

## Bundled Module Loading

`setBundleModuleLoader(loader)` stores the hook on `globalThis` so bundled and
external copies of `@eggjs/utils` share the same loader. The loader receives the
original `importModule()` filepath after POSIX separator normalization, or a
virtual specifier. Returning `undefined` falls back to the normal resolution
path; other return values follow the same default-export unwrapping rules as
`importModule()`.

When a bundle loader is installed and `importModule()` falls through to native
ESM loading, `packages/utils/src/import.ts` uses an opaque native dynamic import
created with `new Function('specifier', 'return import(specifier);')`. This
prevents bundlers such as Turbopack from rewriting non-static dynamic import
expressions and preserves Node's native fallback for external ESM modules.

## Module-loader hook priority

`importModule()` resolves through three hooks before the native `import()` /
`require()` fallback (see `packages/utils/src/import.ts`):

1. **`__EGG_BUNDLE_MODULE_LOADER__`** (`setBundleModuleLoader`) — synchronous
   `globalThis` bundle-map lookup, runs before on-disk resolution and receives
   the POSIX-normalized filepath. Returning `undefined` falls through.
2. **Snapshot loader** (`setSnapshotModuleLoader`) — a module-local hook (not a
   `globalThis` global) used by the V8 snapshot entry generator, keyed by the
   resolved path. Once registered it handles every load that reaches it, so the
   importer below is bypassed while it is active.
3. **`__EGG_MODULE_IMPORTER__`** — async (or sync, since awaited) `globalThis`
   importer that receives the resolved path (the `importResolve()` result, with
   OS-native separators — _not_ normalized) and replaces native `await import()`.

The bundle loader and importer globals are typed in `@eggjs/typings`
(`BundleModuleLoader`, `ModuleImporter`) and augmented onto `globalThis` in
`@eggjs/typings/global`. `@eggjs/core`'s `ManifestLoaderFS` (`#loadBundledModule`)
consults **only** `__EGG_BUNDLE_MODULE_LOADER__`; the importer/native path is
reached transitively through its `@eggjs/loader-fs` fallback, which calls back
into `importModule()`. The tegg loader (`LoaderUtil.loadFile`) consults both
globals directly, but passes the _original_ loader filepath separator-normalized
to POSIX — not the `importResolve()` output — so the two callers differ in both
which path they pass and whether it is normalized.

`__EGG_MODULE_IMPORTER__` has two contract uses:

- **Bundler-based test runners (Vitest):** route loading through the runner's
  module graph so loader and test file share one module instance (otherwise
  `ctx.getEggObject(ClassRef)` throws "can not get proto").
- **V8 startup-snapshot restore:** the deserialized main function has no host
  dynamic-import callback, so native `import()` throws
  (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`). The snapshot entry installs a
  synchronous `require()`-based importer (`createRequire()` over the output
  dir); `require()` loads ESM on Node >= 22. Covered by
  `test/module-importer.test.ts` (inline require importer +
  `fixtures/module-importer-require-esm/run.mjs`, which asserts the no-callback
  premise via `node:vm`).
