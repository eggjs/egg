# @eggjs/utils

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/utils.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/utils.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/utils
[download-image]: https://img.shields.io/npm/dm/@eggjs/utils.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/utils

Utils for all egg projects.

## Installation

```bash
npm i @eggjs/utils
```

## API

### `getPlugins(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework
- {String} env - egg environment

### `getLoadUnits(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework
- {String} env - egg environment

### `getConfig(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework
- {String} env - egg environment

### `getFrameworkPath(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework

### `setBundleModuleLoader(loader)`

Register a module loader hook for bundled Egg apps. The hook runs before the
normal `importModule()` resolution path.

- {Function | undefined} loader - a synchronous function that receives the
  original `filepath` argument passed to `importModule()` after POSIX separator
  normalization, or a virtual specifier. It does not receive the resolved
  absolute file path from `importResolve()`. Return `undefined` to fall back to
  the normal import path.

The bundle loader is stored on `globalThis`, so bundled and external copies of
`@eggjs/utils` share the same loader. Non-`undefined` results follow the same
default export unwrapping rules as `importModule()`, including
`importDefaultOnly`.

### Bundle / snapshot module-loading hooks

`importModule()` resolves a module through the following hooks, in order. The
first one that produces a value wins; otherwise it falls back to the native
`import()` / `require()` path:

1. **`globalThis.__EGG_BUNDLE_MODULE_LOADER__`** — set via
   `setBundleModuleLoader()`. Looks up a module already inlined into the bundle
   (typically a static bundle map emitted by `egg-bundler`). Runs before on-disk
   resolution and receives the POSIX-normalized `importModule()` filepath or a
   virtual specifier. Return `undefined` to fall through.
2. **Snapshot module loader** — set via `setSnapshotModuleLoader()`. This is a
   module-local hook (not a `globalThis` global) used by the V8 snapshot entry
   generator to serve pre-bundled modules synchronously, keyed by the resolved
   path. Once registered it handles every load that reaches it, so the importer
   below is not consulted while it is active.
3. **`globalThis.__EGG_MODULE_IMPORTER__`** — an async (or sync, since the value
   is awaited) importer that receives the resolved file path (the
   `importResolve()` result, with OS-native separators — not normalized). When
   set, and the two hooks above did not resolve the module, it replaces the
   native `await import(filePath)`.

The bundle loader and importer globals are typed in `@eggjs/typings`
(`BundleModuleLoader` / `ModuleImporter`); import `@eggjs/typings/global` to pick
up the `declare global` augmentation. These hooks are the contract that
`egg-bundler`'s generated entry relies on. `@eggjs/core`'s `ManifestLoaderFS`
consults `__EGG_BUNDLE_MODULE_LOADER__` directly; its importer/native fallback is
reached through `@eggjs/loader-fs`, which calls back into `importModule()`. The
tegg loader (`LoaderUtil.loadFile`) consults both globals directly, passing the
loader filepath with separators normalized to POSIX.

`__EGG_MODULE_IMPORTER__` has two main uses:

- **Bundler-based test runners (e.g. Vitest):** route module loading through the
  runner's own module graph so the loader and the test file share a single
  module instance (otherwise `ctx.getEggObject(ClassRef)` fails with
  "can not get proto").
- **V8 startup-snapshot restore:** the deserialized main function runs without a
  host dynamic-import callback, so native `import()` throws. The snapshot entry
  installs a synchronous `require()`-based importer (`createRequire()` over the
  bundle output dir); `require()` can load ESM on Node >= 22, so modules resolve
  without dynamic import.

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
