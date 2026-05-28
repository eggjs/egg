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
├── app/port/binary.html               # app runtime asset copied from <baseDir>/app/port/binary.html
├── app/port/login.html                # app runtime asset copied from <baseDir>/app/port/login.html
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
`globalThis.__EGG_BUNDLE_MODULE_LOADER__`, creates `ManifestLoaderFS` from the
bundle manifest, then calls
`startEgg({ baseDir: outputDir, framework, mode: 'single', loaderFS })`. This
lets Egg loader file discovery and module loading resolve through the inlined
bundle map before falling back to the real filesystem, while framework specifier
lookup is served by the already imported bundled framework module without adding
framework path aliases. Runtime lookup keeps the deploy output directory
separate from the original app paths: the bundle map is keyed by relKey,
output-dir absolute paths, precomputed original app absolute paths, and manifest
`resolveCache` request aliases. Application code and plugins may still use `fs`
for resources such as config, views, or assets.

## Runtime assets

The bundler copies application runtime assets from `<baseDir>/app` by default
into the same relative path under `outputDir`, excluding manifest-known module
files and source-like files such as `.js`, `.ts`, `.mjs`, and `.cjs` outside
static asset directories. For example, `<baseDir>/app/port/binary.html` is
emitted as `<outputDir>/app/port/binary.html`. Since bundled workers start Egg with
`baseDir: outputDir`, existing reads such as
`fs.readFile(path.join(app.config.baseDir, 'app/port/binary.html'))` resolve to
the copied file in bundle mode and continue to resolve to the original file in
non-bundle mode. Static asset directories such as `app/public`, `app/assets`,
and `app/static` are copied verbatim so frontend `.js` and `.css` files remain
servable from the bundled app. Applications may replace those force-copy
directories with `bundle.runtimeAssets.forceCopyDirs` in `module.yml`, for
example:

```yaml
bundle:
  runtimeAssets:
    roots:
      - app
    forceCopyDirs:
      - app/port
      - app/public
```

Applications may also replace the scanned roots with
`bundle.runtimeAssets.roots`. Root entries are baseDir-relative directories, and
the output keeps the same baseDir-relative path.

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
packages as `extraExternals`, plus native optional platform packages declared by
root dependencies.
The native addon and missing optional peer checks run only while resolving the
app's root dependencies/optionalDependencies; `ExternalsResolver` does not
recursively scan every transitive dependency. `externals.inline`
removes an auto-detected external unless the same name is also present in
`externals.force`. External packages must be installed alongside the bundle —
typically by copying the app's `package.json` next to `worker.js` and running
`npm ci --omit=dev`, or by deploying into an environment where these dependencies
are already installed. ESM-only packages, `egg`, `@swc/helpers`, and `@eggjs/*`
packages are bundled by default unless an explicit or auto-detected external
rule applies, such as `externals.force`, peer/optional dependency metadata,
native addon detection, or missing optional peer detection. For wrappers around
native optional platform packages that cannot be loaded through `createRequire`,
the wrapper stays bundled so the CommonJS standalone output does not emit a
plain `require(wrapper)`, while the optional native platform packages remain
external.

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
