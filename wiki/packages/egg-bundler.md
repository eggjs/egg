---
title: Egg Bundler
type: package
summary: Bundles Egg applications into deployable CommonJS artifacts and powers the egg-bin bundle command.
source_files:
  - tools/egg-bundler/src/index.ts
  - tools/egg-bundler/src/lib/Bundler.ts
  - tools/egg-bundler/src/lib/EntryGenerator.ts
  - tools/egg-bundler/src/lib/ExternalsResolver.ts
  - tools/egg-bundler/src/lib/ManifestLoader.ts
  - tegg/core/loader/src/LoaderUtil.ts
  - tools/egg-bin/src/commands/bundle.ts
  - tools/egg-bundler/README.md
  - tools/egg-bundler/docs/output-structure.md
updated_at: 2026-05-10
status: active
---

# Egg Bundler

`@eggjs/egg-bundler` is a developer tooling package under `tools/egg-bundler/`.
It exposes `bundle(config)` and the `Bundler` class for producing a deployable
CommonJS artifact from an Egg application.

## Public Surfaces

- `tools/egg-bundler/src/index.ts` exports `bundle`, `Bundler`, the helper
  classes, and the public config/result types.
- `tools/egg-bin/src/commands/bundle.ts` wires the package into
  `egg-bin bundle`.

## Bundle Flow

1. `ManifestLoader` loads the app startup manifest, defaulting to
   `<baseDir>/.egg/manifest.json`.
2. `ExternalsResolver` classifies packages that should stay external.
3. `EntryGenerator` writes a synthetic worker entry that installs the bundle
   manifest/module loader before starting Egg.
4. `PackRunner` invokes `@utoo/pack`.
5. `Bundler` patches generated `import.meta` output, copies runtime assets,
   writes `bundle-manifest.json`, and returns absolute output paths.

## Current Behavior

- Relative `outputDir` values are resolved from `baseDir`.
- Default mode is `production`; `development` is also accepted.
- If `<baseDir>/.egg/manifest.json` is missing, `ManifestLoader` starts the app
  with `metadataOnly: true` to generate it. This skips the agent and normal boot
  lifecycle, runs `loadMetadata()` hooks, and the manifest generation child
  process exits after writing the manifest, so registered `beforeClose` hooks do
  not run.
- Applications may define stable bundle config in `<baseDir>/module.yml`.
  `bundle.pack.resolve.alias` is merged into the pack resolve config, with
  explicit programmatic aliases taking precedence over aliases from the file.
  Dot-relative alias targets are resolved from `baseDir`.
- Runtime assets are copied from `app` by default into the same relative path in
  the output. Manifest-known source files, tegg decorated files, and
  `resolveCache` targets are excluded from asset copying; source-like extensions
  are also skipped unless they are under force-copy directories. The default
  force-copy directories are `app/public`, `app/assets`, and `app/static`.
  `bundle.runtimeAssets.roots` and `bundle.runtimeAssets.forceCopyDirs`, from
  either `module.yml` or programmatic config, replace those defaults.
- The generated app runs in Egg single-process mode. Its worker entry treats the
  deploy output directory as the runtime Egg `baseDir`, passes the framework
  specifier explicitly to `startEgg`, maps that specifier to the already bundled
  framework module, and precomputes original app absolute aliases so bundled
  module lookup can serve relKeys, output-dir absolute paths, original app
  absolute paths, and manifest `resolveCache` request aliases.
- `ManifestLoader` normalizes tegg `moduleReferences[].path` and
  `moduleDescriptors[].unitPath` to the same bundle-relative form so the bundled
  worker can match tegg decorated files. During runtime, tegg's `LoaderUtil`
  checks `globalThis.__EGG_BUNDLE_MODULE_LOADER__` before falling back to
  dynamic `import()`.
- Explicit `externals.force` entries are external, and `ExternalsResolver`
  auto-detects root `peerDependencies`, root `optionalDependencies`, root
  dependency packages with native addons, root dependency packages whose optional
  peer dependencies cannot be resolved, the missing optional peer package names
  themselves as `extraExternals`, and native optional platform packages as
  external.
- `externals.inline` removes an auto-detected external unless the same package
  name is also listed in `externals.force`.
- ESM-only packages, `egg`, `@swc/helpers`, and `@eggjs/*` packages are bundled
  by default unless `externals.force` or dependency metadata applies. If a
  wrapper around native optional platform packages cannot be loaded through
  `createRequire`, the wrapper stays bundled and the platform packages are kept
  external.
- `BundlerConfig.tegg` is accepted but intentionally not wired into the current
  implementation yet.
