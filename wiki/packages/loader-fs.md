---
title: Loader FS Package
type: package
summary: Shared loader-facing filesystem boundary for Egg loaders and future bundled runtimes.
source_files:
  - packages/loader-fs/src/index.ts
  - packages/loader-fs/src/manifest_loader_fs.ts
  - tegg/core/loader/src/LoaderFactory.ts
  - tegg/core/loader/src/TeggManifestLoaderFS.ts
  - tegg/core/types/src/scope/TeggScope.ts
  - tegg/plugin/dal/src/lib/DataSource.ts
  - packages/loader-fs/package.json
updated_at: 2026-08-03
status: active
---

# Loader FS Package

`@eggjs/loader-fs` owns the small filesystem interface used by loader code. It
exports `LoaderFS`, `LoaderFSGlobOptions`, `RealLoaderFS`, and
`ManifestLoaderFS`.

`LoaderFS` intentionally covers only loader-facing operations: `exists`, `stat`,
`realpath`, `readJSON`, `glob`, and `loadFile`. It is not a Node.js `fs`
polyfill. A source may additionally implement `getKnownFiles(directory)` when
it has an authoritative, precomputed view. `undefined` means the source has no
such view and discovery should fall back to `glob`; an empty array is an
authoritative empty directory.

`RealLoaderFS` is the default implementation for normal non-bundled runtime. It
delegates file checks to Node `fs`, JSON reads to `utility.readJSONSync`, glob
discovery to `globby.sync`, and module loading to the same `@eggjs/utils`
`importModule()` path used by the core loader.

`ManifestLoaderFS` presents a host-neutral manifest file index through the same
interface. Its input contains only `baseDir`, `fileDiscovery`, and
`resolveCache`; it does not depend on Egg's `ManifestStore` or on tegg types.
Egg can pass `ManifestStore` structurally, while standalone uses
`createTeggManifestLoaderFS()` to adapt
`TeggManifest.moduleDescriptors[].decoratedFiles` into the same file index.
Manifest directories expose their exact indexed files through `getKnownFiles`,
including TypeScript-origin source keys and authoritative empty lists. Unknown
directories delegate to the fallback source.

`@eggjs/core` depends on this package and re-exports its public API so existing
core consumers can still import the loader filesystem boundary from core while
tegg and later bundled runtime packages can depend on the smaller package
directly.

`ModuleLoader` first asks its `LoaderFS` for an authoritative file list. This
lets a manifest source control discovery without leaking bundle state into the
generic loader. Sources without such a list keep the normal behavior:
`LoaderUtil.filePattern()` selects supported runtime extensions and
`LoaderFS.glob()` scans the directory. Consequently `EGG_TS_ENABLE=false`
continues to exclude real TypeScript files, but it does not discard `.ts` keys
that a manifest resolves from an in-memory bundle module map.

`LoaderFS` intentionally does not resolve a tegg module name. The host resolves
identity onto `ModuleDescriptor`, `GlobalGraph.moduleConfigList` carries it, and
`LoadUnitFactory` consumes it. LoaderFS only controls which files are visible to
`ModuleLoader`.

Each host supplies its selected file view when it starts the initial module
load. `ModuleLoader.createModuleLoader()` is the integration point that installs
that view as the current `TeggScope`'s module-loader filesystem; without a
host-supplied view it initializes one `RealLoaderFS`. A later explicit view is
authoritative, so a manifest-backed view can replace an earlier real-filesystem
default. Generic `LoaderFS` constructors remain side-effect free and
host-neutral. Later module loaders created without an explicit filesystem see
the same per-app file view as the initial module scan. This lets dynamic
multi-instance callbacks such as DAL keep their existing loader-based discovery
without adding host or loader state to their public context. The scoped value is
dropped with the app's scope bag and remains isolated between concurrent apps.
