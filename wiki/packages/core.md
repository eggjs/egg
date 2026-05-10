---
title: Core Package
type: package
summary: Loader, lifecycle, and application core primitives used by Egg runtime packages.
source_files:
  - packages/core/src/index.ts
  - packages/core/src/loader/file_loader.ts
  - packages/core/src/loader/context_loader.ts
  - packages/core/src/loader/egg_loader.ts
updated_at: 2026-05-10
status: active
---

# Core Package

`@eggjs/core` exports the runtime loader primitives used to assemble an Egg
application, including `EggLoader`, `FileLoader`, `ContextLoader`, manifest
support, lifecycle, and base context classes.

## LoaderFS

`@eggjs/core` depends on `@eggjs/loader-fs` for the minimal loader-facing
filesystem boundary. It re-exports `LoaderFS`, `LoaderFSGlobOptions`, and
`RealLoaderFS` for core loader consumers, but the implementation lives in the
standalone package so tegg and bundled runtimes can share the same small
boundary without depending on core.

`EggLoaderOptions`, `FileLoaderOptions`, and `ContextLoaderOptions` can carry a
custom `loaderFS`. `EggLoader` passes its loader FS into `loadToApp()` and
`loadToContext()` so later bundled loaders can replace file discovery and module
loading without changing the public loader call sites.
