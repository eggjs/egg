---
title: Utils Package
type: package
summary: Shared utility package for Egg module loading, config/plugin helpers, and bundled module-loader integration.
source_files:
  - packages/utils/README.md
  - packages/utils/src/import.ts
  - packages/utils/test/bundle-import.test.ts
updated_at: 2026-05-06
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
