---
title: Egg Bundler
type: package
summary: Bundles Egg applications into deployable CommonJS artifacts and powers the egg-bin bundle command.
source_files:
  - tools/egg-bundler/src/index.ts
  - tools/egg-bundler/src/lib/Bundler.ts
  - tools/egg-bundler/src/lib/EntryGenerator.ts
  - tools/egg-bin/src/commands/bundle.ts
  - tools/egg-bundler/docs/output-structure.md
updated_at: 2026-05-03
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
5. `Bundler` writes `bundle-manifest.json` and returns absolute output paths.

## Current Behavior

- Relative `outputDir` values are resolved from `baseDir`.
- Default mode is `production`; `development` is also accepted.
- If `<baseDir>/.egg/manifest.json` is missing, `ManifestLoader` starts the app
  with `metadataOnly: true` to generate it. This skips the agent and normal boot
  lifecycle, runs `loadMetadata()` hooks, and the manifest generation child
  process exits after writing the manifest, so registered `beforeClose` hooks do
  not run.
- The generated app runs in Egg single-process mode. Its worker entry treats the
  deploy output directory as the runtime Egg `baseDir`, passes the framework
  specifier explicitly to `startEgg`, maps that specifier to the already bundled
  framework module, and precomputes original app absolute aliases so bundled
  module lookup can serve relKeys, output-dir absolute paths, original app
  absolute paths, and manifest `resolveCache` request aliases.
- Explicit `externals.force` entries are external, and `ExternalsResolver`
  auto-detects root `peerDependencies`, root `optionalDependencies`, root
  dependency packages with native addons, root dependency packages whose optional
  peer dependencies cannot be resolved, and the names of those missing optional
  peer packages as external.
- `externals.inline` removes an auto-detected external unless the same package
  name is also listed in `externals.force`.
- ESM-only packages, `egg`, `@swc/helpers`, and `@eggjs/*` packages are bundled
  by default unless force-external or dependency/native-addon rules apply.
- `BundlerConfig.tegg` is accepted but not applied by the current implementation
  yet.
