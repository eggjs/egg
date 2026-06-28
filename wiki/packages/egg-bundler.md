---
title: Egg Bundler
type: package
summary: Bundles Egg applications into deployable CommonJS artifacts and powers the egg-bin bundle command.
source_files:
  - tools/egg-bundler/src/index.ts
  - tools/egg-bundler/src/lib/Bundler.ts
  - tools/egg-bundler/src/lib/EntryGenerator.ts
  - tools/egg-bundler/src/lib/ExternalsResolver.ts
  - tools/egg-bundler/src/lib/prelude.ts
  - tools/egg-bin/src/commands/bundle.ts
  - tools/egg-bundler/docs/output-structure.md
updated_at: 2026-06-28
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

### Snapshot lazy-external defaults

In `snapshot: true` mode the bundler keeps a set of modules **lazy-external** so a
V8 startup snapshot stays serializable: each is emitted as an `externalRequire`,
left out of the build-time heap (a member-proxy stub from the prelude's
`__makeLazyExt`), and forwarded to the real module at restore via
`globalThis.__RUNTIME_REQUIRE`. The injected hook also lazy-stubs any **non-builtin**
external at build (`!__isBuiltin(id)`); the explicit list mainly exists to (a) cover
builtins the `!isBuiltin` rule skips and (b) **force npm packages external** that
would otherwise be inlined.

- `DEFAULT_SNAPSHOT_LAZY_MODULES` (in `src/lib/prelude.ts`) covers the Node network
  stack (`http`/`https`/`http2`/`tls`/`dns`), `inspector`, **and egg's HTTP client
  stack `undici` + `urllib`**. Egg builds its `HttpClient` (urllib → undici) during
  boot, and undici instantiates an llhttp `WebAssembly` (disabled under
  `--build-snapshot`) + `HTTPParser` that cannot be serialized. As npm packages
  urllib/undici would be inlined; listing them forces them external (`Bundler` adds
  the lazy ids to the externals map) so the member-proxy stub is used at build — an
  app gets a serializable snapshot without listing them in `egg.snapshot.lazyModules`.
- The member-proxy records the build-time access path (`get`/`apply`/`construct`) and
  replays it against the real module on restore, so `class HttpClient extends
urllib.HttpClient` (and urllib's own `class BaseAgent extends undici.Agent`) keep
  working: the `extends` is evaluated against the build stub, then `super(...)` /
  inherited methods resolve to the real base class after deserialization.

#### When does a new dependency need adding?

Only a package that **directly** creates non-serializable native/WASM state at
module-eval or boot-time instantiation needs a list entry (like `undici`, which
compiles llhttp WASM). A package that only reaches the network/native stack
**transitively** is already covered, because the underlying builtins are lazy:

- `@modelcontextprotocol/sdk` (a default tegg-controller dep, loaded at boot via
  `tegg/plugin/controller` → `MCPControllerRegister`) → its StreamableHTTP
  transport `require`s `@hono/node-server`, which does a top-level
  `require("http2")` + `class extends globalThis.Request`. `http2` is already lazy
  and `globalThis.Request` is stubbed by the prelude, and no MCP transport/server
  is instantiated at boot — so the SDK does **not** need a list entry.
- `@grpc/grpc-js`, `ws` — not present in OSS tegg; gRPC would route through the
  already-lazy `http2` anyway. No entry needed.

`Inference:` audited 2026-06-28 against `tegg/plugin/controller`, default egg
plugins, and the suspect packages' module-eval closures. The opt-in
`mcp-client`/`mcp-proxy`/`langchain` plugins pull the SDK _client_ transports
(`eventsource`/`cross-spawn`/`pkce-challenge`); if an app enables those and
snapshots, re-assess via `egg.snapshot.lazyModules` — that is an app concern, not
a framework default.
