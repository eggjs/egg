---
title: Loader FS Package
type: package
summary: Shared loader-facing filesystem boundary and default real filesystem implementation.
source_files:
  - packages/loader-fs/src/index.ts
  - packages/loader-fs/test/index.test.ts
updated_at: 2026-05-10
status: active
---

# Loader FS Package

`@eggjs/loader-fs` owns the small filesystem boundary shared by Egg loader
runtimes. It is not a full Node.js `fs` polyfill; it only covers the loader
operations needed by Egg-style file discovery and loading: `exists`, `stat`,
`realpath`, `readJSON`, `glob`, and `loadFile`.

`RealLoaderFS` is the default implementation. It preserves normal non-bundled
runtime behavior by delegating to `fs.existsSync`, `fs.statSync`,
`fs.realpathSync`, `utility.readJSONSync`, `globby.sync`, and Egg's standard
module loading semantics through `@eggjs/utils` `importModule()`.

`@eggjs/core` consumes and re-exports this package for `EggLoader`,
`FileLoader`, and `ContextLoader` options. Future manifest-backed or bundled
loaders can provide another `LoaderFS` implementation without making tegg or
runtime packages depend on `@eggjs/core`.
