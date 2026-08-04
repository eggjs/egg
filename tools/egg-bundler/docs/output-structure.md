# Bundle output structure

`@eggjs/egg-bundler` produces a runnable CJS bundle under the configured
`outputDir`. Everything except declared externals is inlined into the generated
worker file by default.

## Layout

```
<outputDir>/
├── worker.js             # self-contained entry produced from worker.entry.ts
├── app/port/binary.html  # runtime asset copied from <baseDir>/app/port/binary.html
├── app/port/login.html   # runtime asset copied from <baseDir>/app/port/login.html
├── package.json          # `{ "type": "commonjs" }`, so Node parses generated *.js as CJS
└── bundle-manifest.json  # reference/debug metadata written by Bundler
```

`pack.singleFile` defaults to `true`. When a programmatic caller explicitly
sets it to `false`, `@utoo/pack` may also emit opaque module-graph and runtime
chunks such as `_root-of-the-server___<hash>.js` and
`_turbopack__runtime.js`. Snapshot builds always force single-file output. The
compiler `tsconfig.json` is written to the bundler's generated entry directory,
not to the deploy output.

For `target: 'cluster'`, `worker.js` is replaced by two role-specific entry
files:

```text
<outputDir>/
├── app_worker.js         # self-contained application worker entry
├── agent_worker.js       # self-contained agent worker entry
├── app/...               # copied runtime assets, when present
├── package.json          # `{ "type": "commonjs" }`
└── bundle-manifest.json
```

The source generator shares its rendering logic, but each role is a separate
entry. With the default single-file setting, `@utoo/pack` inlines the complete
dependency graph into both outputs; snapshot builds rely on this so each file
can independently build and restore its own V8 snapshot blob.

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

The supported ordinary cluster workflow is:

```bash
egg-bin bundle --cluster
egg-scripts start --bundle --bundle-dir ./dist-bundle
```

`egg-scripts` resolves `app_worker.js` and `agent_worker.js` from
`--bundle-dir`, then supplies them to the cluster launcher. Plain bundles
support process and `worker_threads` start modes. To build and restore
role-specific V8 snapshots:

```bash
egg-bin snapshot build --cluster
egg-scripts start --bundle \
  --app-snapshot-blob ./dist-bundle/app.snapshot.blob \
  --agent-snapshot-blob ./dist-bundle/agent.snapshot.blob
```

Either role blob may be omitted; that role then starts from its bundle
JavaScript. Snapshot blobs require process mode.

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
      - app/public
      - app/assets
      - app/static
      - app/port
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
  "target": "single",
  "baseDir": "/abs/path/to/app",
  "framework": "egg",
  "entries": [{ "name": "worker", "source": "/abs/path/to/app/.egg-bundle/entries/worker.entry.ts" }],
  "externals": ["some-native-addon", "..."],
  "chunks": ["package.json", "worker.js", "..."]
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
`externals.force`. External packages must be resolvable from the output worker.
A typical deployment keeps `outputDir` below the application or deployment root
and installs production dependencies at that root. Do not overwrite the
generated output `package.json`: its `{ "type": "commonjs" }` marker is required
when the parent application package uses ESM. ESM-only packages, `egg`,
`@swc/helpers`, and `@eggjs/*`
packages are bundled by default unless an explicit or auto-detected external
rule applies, such as `externals.force`, peer/optional dependency metadata,
native addon detection, or missing optional peer detection. For wrappers around
native optional platform packages that cannot be loaded through `createRequire`,
the wrapper stays bundled so the CommonJS standalone output does not emit a
plain `require(wrapper)`, while the optional native platform packages remain
external.

## Known limitations

- **Cluster bootstrap modules**: bundled cluster workers do not support
  `options.require`; the supported launcher fails before spawning workers.
- **Snapshot blobs and worker threads**: plain cluster bundles support
  `worker_threads`, but custom V8 snapshot blobs require process mode.
- **Native addons**: always external. If a native module is missing from the
  deployment target, the bundle will fail to start at runtime with the usual
  Node module resolution error.
- **Tegg**: decorated files listed in `manifest.extensions.tegg` are included
  as side-effect imports in the worker entry; if `tegg` is disabled in
  `BundlerConfig`, tegg collection is intended to be skipped (not yet wired).
