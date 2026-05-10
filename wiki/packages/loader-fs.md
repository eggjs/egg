---
title: Loader FS Package
type: package
summary: Shared loader-facing filesystem boundary for Egg loaders and future bundled runtimes.
source_files:
  - packages/loader-fs/src/index.ts
  - packages/loader-fs/package.json
updated_at: 2026-05-10
status: active
---

# Loader FS Package

`@eggjs/loader-fs` owns the small filesystem interface used by loader code. It
exports `LoaderFS`, `LoaderFSGlobOptions`, and `RealLoaderFS`.

`LoaderFS` intentionally covers only loader-facing operations: `exists`, `stat`,
`realpath`, `readJSON`, `glob`, and `loadFile`. It is not a Node.js `fs`
polyfill.

`RealLoaderFS` is the default implementation for normal non-bundled runtime. It
delegates file checks to Node `fs`, JSON reads to `utility.readJSONSync`, glob
discovery to `globby.sync`, and module loading to the same `@eggjs/utils`
`importModule()` path used by the core loader.

`@eggjs/core` depends on this package and re-exports its public API so existing
core consumers can still import the loader filesystem boundary from core while
tegg and later bundled runtime packages can depend on the smaller package
directly.
