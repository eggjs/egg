# Bundle Deployment

Egg can bundle an application into a self-contained, deployable CommonJS artifact
using [`@eggjs/egg-bundler`](https://github.com/eggjs/egg/tree/next/tools/egg-bundler),
driven by the `egg-bin bundle` command. The bundle inlines your application code,
framework, plugins, and dependencies into a small set of chunks that boot in Egg's
single-process mode — useful for fast cold starts, smaller deploy images, and
serverless targets.

Bundling builds on the [Startup Manifest](./manifest.md): the bundler reuses the
manifest's file-discovery, module-resolution, and tegg module metadata so the
bundled app skips filesystem scanning at runtime.

## Build

```bash
$ egg-bin bundle
```

This writes the artifact to `./dist-bundle` by default. Common options:

| Option              | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `--output <dir>`    | Output directory. Defaults to `./dist-bundle`.                           |
| `--mode <mode>`     | `production` (default) or `development`.                                 |
| `--framework <pkg>` | Framework package specifier. Defaults to `egg` (or `pkg.egg.framework`). |
| `--force-external`  | Package name to always keep external (repeatable).                       |
| `--inline-external` | Package name to force-inline even if auto-detected as external.          |

Most apps need no `--force-external` flags: the bundler auto-detects packages that
must stay external (native addons, optional platform packages, packages with
native bindings, and unresolved optional peers) and inlines everything else,
including `egg` and `@eggjs/*`.

If `<baseDir>/.egg/manifest.json` is missing, the bundler generates it first by
starting the app with `metadataOnly: true` (which runs `loadMetadata()` hooks
and exits without booting the agent or normal lifecycle).

### Configuration via `module.yml`

Apps can declare stable bundle configuration in `<baseDir>/module.yml`:

```yaml
bundle:
  runtimeAssets:
    # Directories scanned for runtime assets (default: app).
    roots:
      - app
    # Directories copied verbatim even for source-like files (default:
    # app/public, app/assets, app/static).
    forceCopyDirs:
      - app/public
      - app/assets
  pack:
    resolve:
      alias:
        some-package: ./node_modules/some-package/index.js
```

## Output

```
dist-bundle/
├── worker.js                 # synthetic worker entry produced by the bundler
├── _root-of-the-server__*.js # @utoo/pack module-graph chunks (opaque names)
├── _turbopack__runtime.js    # @utoo/pack runtime shim
├── app/...                   # copied runtime assets (html/static, etc.)
├── tsconfig.json             # written for the SWC compiler
├── package.json              # { "type": "commonjs" }
└── bundle-manifest.json      # reference metadata (externals, chunks, ...)
```

See the [output structure reference](https://github.com/eggjs/egg/blob/next/tools/egg-bundler/docs/output-structure.md)
for full details.

## Run

Packages classified as **external** are not inlined and must be installed
alongside the bundle. The simplest way is to copy the app's `package.json` next
to `worker.js` and install production dependencies:

```bash
$ cd dist-bundle
$ cp ../package.json .
$ npm ci --omit=dev
$ node worker.js
```

The worker entry installs the bundle's manifest store and module loader, then
starts Egg with `baseDir` set to the output directory in `mode: 'single'`, so the
agent runs in-process with the worker.

## Tegg applications

Bundling supports tegg apps. Because the module source files do not exist on disk
in a bundle, tegg module discovery is served from the manifest's recorded
`decoratedFiles` instead of globbing. This keeps the full tegg dependency-injection
graph intact at runtime, including auto-resolved injects of egg-compatible objects
such as `@Inject() httpClient`, `logger`, and `config` (which are disambiguated by
the framework's load-unit lifecycle hooks).

::: tip
Bundling a tegg app requires `@eggjs/core`, `egg`, and `@eggjs/tegg-plugin`
versions that include the bundle-boot path fixes. Use the latest release.
:::

## Limitations

- **Single process only**: the bundle runs in `mode: 'single'`, so the agent runs
  in-process with the worker. Cluster-mode bundles are not yet supported.
- **Native addons** are always external and must be present in the deploy target.
- **External packages** must be installed next to `worker.js` (see [Run](#run)).
