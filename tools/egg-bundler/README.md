# @eggjs/egg-bundler

Bundle an Egg application into a deployable CommonJS artifact.

The bundler is used by `egg-bin bundle` and is also available as a programmatic
API for tooling that needs to build bundles directly.

## Usage

```ts
import { bundle } from '@eggjs/egg-bundler';

await bundle({
  baseDir: '/path/to/app',
  outputDir: './dist-bundle',
  framework: 'egg',
  mode: 'production',
  pack: {
    resolve: {
      alias: {
        'some-package': '/path/to/app/node_modules/some-package/index.js',
      },
    },
  },
});
```

`outputDir` is resolved from `baseDir` when it is relative. The default manifest
path is `<baseDir>/.egg/manifest.json`.

If the startup manifest is missing, the bundler generates it by starting the app
with `metadataOnly: true`. In that mode Egg skips the agent and normal boot
lifecycle, runs `loadMetadata()` hooks, and the manifest generation child
process exits after writing the manifest, so registered `beforeClose` hooks do
not run.

## Options

| Option               | Description                                                                     |
| -------------------- | ------------------------------------------------------------------------------- |
| `baseDir`            | Application root directory. Required.                                           |
| `outputDir`          | Output directory for the bundled artifact. Required.                            |
| `manifestPath`       | Path to `manifest.json`. Defaults to `<baseDir>/.egg/manifest.json`.            |
| `framework`          | Framework name or absolute path. Defaults to `egg`.                             |
| `mode`               | Build mode, `production` or `development`. Defaults to `production`.            |
| `tegg`               | Accepted by `BundlerConfig`, but not applied by the current implementation yet. |
| `externals.force`    | Package names to always keep external.                                          |
| `externals.inline`   | Package names to force inline even if auto-detected as external.                |
| `pack.buildFunc`     | Test hook for replacing the real `@utoo/pack` build entry.                      |
| `pack.rootPath`      | Override the monorepo workspace root used by `@utoo/pack`.                      |
| `pack.resolve.alias` | Application-supplied `@utoo/pack` resolve aliases.                              |

## Result

`bundle()` resolves with:

| Field          | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `outputDir`    | Absolute output directory.                                 |
| `files`        | Sorted absolute paths for files written into the artifact. |
| `manifestPath` | Absolute path to `bundle-manifest.json`.                   |

## Running The Bundle

```bash
cd dist-bundle
node worker.js
```

The generated worker entry runs the app in Egg's single-process mode and serves
framework file discovery/module resolution from the inlined bundle map.

See [output-structure.md](./docs/output-structure.md) for artifact layout,
externals behavior, and current limitations.
