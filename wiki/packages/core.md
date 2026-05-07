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
updated_at: 2026-05-07
status: active
---

# Core Package

`@eggjs/core` exports the runtime loader primitives used to assemble an Egg
application, including `EggLoader`, `FileLoader`, `ContextLoader`, manifest
support, lifecycle, and base context classes.

## LoaderFS

`LoaderFS` is the minimal filesystem boundary for loader-facing file access. It
covers `exists`, `stat`, `realpath`, `readJSON`, `glob`, and `loadFile` without
trying to polyfill the full Node.js `fs` module.

`RealLoaderFS` is the default implementation. It preserves normal non-bundled
runtime behavior by delegating to `fs.existsSync`, `fs.statSync`,
`fs.realpathSync`, `utility.readJSONSync`, `globby.sync`, and the existing
`utils.loadFile()` helper.

`EggLoaderOptions`, `FileLoaderOptions`, and `ContextLoaderOptions` can carry a
custom `loaderFS`. `EggLoader` passes its loader FS into `loadToApp()` and
`loadToContext()` so later bundled loaders can replace file discovery and module
loading without changing the public loader call sites.
