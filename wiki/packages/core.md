---
title: Core Package
type: package
summary: Loader, lifecycle, and application core primitives used by Egg runtime packages.
source_files:
  - packages/core/src/index.ts
  - packages/core/src/loader/loader_fs.ts
  - packages/core/src/loader/file_loader.ts
  - packages/core/src/loader/context_loader.ts
  - packages/core/src/loader/egg_loader.ts
updated_at: 2026-05-30
status: active
---

# Core Package

`@eggjs/core` exports the runtime loader primitives used to assemble an Egg
application, including `EggLoader`, `FileLoader`, `ContextLoader`, manifest
support, lifecycle, and base context classes.

## LoaderFS

`@eggjs/core` consumes and re-exports `LoaderFS` and `RealLoaderFS` from
`@eggjs/loader-fs`. It also exports `ManifestLoaderFS`, the bundled-runtime
implementation backed by an Egg startup manifest. The abstraction remains the
minimal filesystem boundary for loader-facing file access: `exists`, `stat`,
`realpath`, `readJSON`, `glob`, and `loadFile`, without trying to polyfill the
full Node.js `fs` module.

`EggLoaderOptions`, `FileLoaderOptions`, and `ContextLoaderOptions` can carry a
custom `loaderFS`. `EggLoader` passes its loader FS into `loadToApp()` and
`loadToContext()` so later bundled loaders can replace file discovery and module
loading without changing the public loader call sites.

`ManifestLoaderFS` answers loader filesystem calls from
`ManifestStore.data.fileDiscovery` and `ManifestStore.data.resolveCache` before
falling back to `RealLoaderFS`. When the bundled module loader is installed on
`globalThis.__EGG_BUNDLE_MODULE_LOADER__`, manifest-backed `readJSON()` and
`loadFile()` can return modules from the bundle map instead of reading the
original source file from disk.
