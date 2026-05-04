# Bundle output structure

`@eggjs/egg-bundler` produces a self-contained, runnable CJS bundle under the
configured `outputDir`. Everything except declared externals is inlined into
the chunks.

## Layout

```
<outputDir>/
├── worker.js                          # main entry chunk produced from the synthetic worker.entry.ts
├── worker.js.map                      # sourcemap for the worker entry
├── _root-of-the-server___<hash>.js    # module graph chunk (@utoo/pack)
├── _root-of-the-server___<hash>.js.map
├── _turbopack__runtime.js             # @utoo/pack runtime shim
├── _turbopack__runtime.js.map
├── tsconfig.json                      # written by PackRunner; SWC reads decorator options from here
├── package.json                       # written by PackRunner; `{ "type": "commonjs" }` so node parses *.js as CJS
└── bundle-manifest.json               # written by Bundler; reference / debug metadata
```

Chunk filenames prefixed with `_turbopack__` or `_root-of-the-server___` come
from `@utoo/pack`'s internal chunking; exact names (and their count) can
change across @utoo/pack versions, so treat them as opaque.

## Running the bundle

```bash
cd <outputDir>
node worker.js
```

The worker entry installs `ManifestStore.setBundleStore(...)` and
`globalThis.__EGG_BUNDLE_MODULE_LOADER__` before calling
`startEgg({ baseDir: outputDir, framework, mode: 'single' })`, so framework
specifier lookup is served by the already imported bundled framework module,
without adding framework path aliases. Runtime lookup keeps
the deploy output directory separate from the original app paths: the bundle map
is keyed by relKey, output-dir absolute paths, precomputed original app absolute
paths, and manifest `resolveCache` request aliases. Application code and plugins
may still use `fs` for resources such as config, views, or assets.

When the bundler generates a missing `.egg/manifest.json` with
`metadataOnly: true`, Egg also records convention-based dynamic lookups from each
load unit into the manifest `resolveCache` and `fileDiscovery`, including
`agent`, `app`, `app/extend/*`, and `app/middleware/*`. This lets bundled
single-mode workers resolve plugin agent hooks, extensions, and middleware that
are normally discovered later during runtime loading.

## `bundle-manifest.json`

A reference file produced by `Bundler` (not consumed at runtime). Shape:

```json
{
  "version": 1,
  "generatedAt": "2026-04-11T00:00:00.000Z",
  "mode": "production",
  "baseDir": "/abs/path/to/app",
  "framework": "egg",
  "entries": [{ "name": "worker", "source": "/abs/path/to/app/.egg-bundle/entries/worker.entry.ts" }],
  "externals": ["egg", "ioredis", "mysql2", "..."],
  "chunks": ["worker.js", "worker.js.map", "..."]
}
```

Use it to inspect what went into the bundle or to drive deterministic-bundle
checks (T17).

## Externals

Packages classified as external by `ExternalsResolver` are **not** inlined.
This includes the user's `externals.force` list plus auto-detected entries from
root `peerDependencies`, root `optionalDependencies`, root dependency packages
with native addons/native binaries, root dependency packages whose optional peer
dependencies cannot be resolved, and the names of those missing optional peer
packages. The native addon and missing optional peer checks run only while
resolving the app's root dependencies/optionalDependencies; `ExternalsResolver`
does not recursively scan every transitive dependency. `externals.inline`
removes an auto-detected external unless the same name is also present in
`externals.force`. External packages must be installed alongside the bundle —
typically by copying the app's `package.json` next to `worker.js` and running
`npm ci --omit=dev`, or by deploying into an environment where these dependencies
are already installed. ESM-only packages, `egg`, `@swc/helpers`, and `@eggjs/*`
packages are bundled by default unless `ExternalsResolver` externalizes them
through `externals.force`, dependency metadata, native addon detection, or
missing optional peer detection.

## Known limitations

- **Agent process**: the bundled app runs in `mode: 'single'`, so the agent
  runs in-process with the worker. Cluster-mode bundles (separate agent
  chunk) are not yet supported.
- **Native addons**: always external. If a native module is missing from the
  deployment target, the bundle will fail to start at runtime with the usual
  Node module resolution error.
- **Tegg**: decorated files listed in `manifest.extensions.tegg` are included
  as side-effect imports in the worker entry; if `tegg` is disabled in
  `BundlerConfig`, tegg collection is intended to be skipped (not yet wired).
