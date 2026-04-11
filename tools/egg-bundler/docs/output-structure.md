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
`setBundleModuleLoader(...)` before calling `startEgg({ baseDir, mode: 'single' })`,
so all framework file discovery and module resolution is served from the
inlined bundle map — no `fs.readdir` scanning at runtime.

## `bundle-manifest.json`

A reference file produced by `Bundler` (not consumed at runtime). Shape:

```json
{
  "version": 1,
  "generatedAt": "2026-04-11T00:00:00.000Z",
  "mode": "production",
  "baseDir": "/abs/path/to/app",
  "framework": "egg",
  "entries": [
    { "name": "worker", "source": "/abs/path/to/app/.egg-bundle/entries/worker.entry.ts" }
  ],
  "externals": ["egg", "ioredis", "mysql2", "..."],
  "chunks": ["worker.js", "worker.js.map", "..."]
}
```

Use it to inspect what went into the bundle or to drive deterministic-bundle
checks (T17).

## Externals

Packages classified as external by `ExternalsResolver` (native addons,
ESM-only packages, peer dependencies, `@eggjs/*`, and the user's
`externals.force` list) are **not** inlined. They must be installed alongside
the bundle — typically by copying the app's `package.json` next to
`worker.js` and running `npm ci --production`, or by deploying the bundle
into an image that already has these dependencies on disk.

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
