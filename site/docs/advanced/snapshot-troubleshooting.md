---
title: Snapshot Troubleshooting
order: 8
---

# Snapshot Troubleshooting

Building a [V8 startup snapshot](./snapshot.md) loads your entire module graph
and serializes the heap. The hard constraint is **everything captured into that
heap must be plain, serializable JavaScript**. A single dependency that opens a
socket, starts a timer, or initializes a native binding at module-evaluation
time can make the whole blob fail to build — or build successfully but crash on
restore.

This page explains how to find the module responsible and how to fix it.

## The one rule: nothing live in the heap

A snapshot freezes the heap at build time and thaws it on restore. Three classes
of value cannot survive that round-trip:

- **Native (C++-backed) bindings** — the llhttp `HTTPParser`, `nghttp2`,
  TLS `SecureContext`, DNS `ChannelWrap`, native addons, etc.
- **libuv handles** — open sockets, listening servers, timers, file handles,
  watchers, and IPC channels.
- **Node's lazy web-global getters** — `fetch`, `Headers`, `Request`,
  `Response`, `FormData`, `WebSocket`, `EventSource`, `MessageEvent`,
  `CloseEvent`, plus `Blob`/`File` (and `node:buffer`'s own `File`/`Blob`
  getters) are accessor properties that initialize Node's built-in undici
  (→ native http/http2) the first time they are touched. The accessor itself is
  not serializable.

A package is **snapshot-unsafe** when it creates any of these _at module-evaluation
time_ or _before `configWillLoad`_ (the point where the build stops). The same
package is usually fine if it defers that work into a function that only runs at
request time.

::: tip What Egg already handles for you
The bundler keeps the Node network stack external and lazy by default
(`http`, `https`, `http2`, `tls`, `dns`, `inspector`, plus their `node:` forms),
and replaces the undici-backed web globals with build-time stubs. You only need
this page when a **third-party dependency** or a **builtin not on that list**
trips the constraint. See [How it works](./snapshot.md#how-it-works) for the
mechanism.
:::

## Step 1 — Identify the failure surface

A snapshot can fail at two distinct points. The error signature tells you which.

### Build-time failure

`egg-bin snapshot build` bundles the app, then wraps
`node --snapshot-blob <blob> --build-snapshot worker.js`. When the V8 serializer
reaches a non-serializable value it **aborts the process natively** — there is no
catchable JS error. You will see one of:

```text
# the child was killed while serializing a native binding
Error: <path>/node --snapshot-blob … --build-snapshot worker.js was killed by signal SIGSEGV

# or it exited non-zero
Error: <path>/node … exited with code 1

# and, because no blob was produced:
snapshot build finished but no blob was written at <output>/snapshot.blob
```

If instead the app threw a normal error while loading metadata (a bad config, a
missing file), the worker prints it before exiting:

```text
[egg-bundler] failed to build snapshot: <message>
```

The first family means **a module captured something unserializable**. The second
means an ordinary boot error — fix it the way you would fix a normal startup
failure.

A third, rarer family comes from the bundler itself, before `node` ever runs:

```text
snapshot prelude: an externalRequire helper was emitted but the lazy hook
could not be injected (its signature did not match). …
```

This means `@utoo/pack`'s codegen for external requires changed shape (usually a
version bump), so the lazy-external dispatch could not be injected. The bundler
**fails closed on purpose** rather than emit a blob that loads the network stack
at build time — it is not an app bug. Align the `@eggjs/egg-bundler` /
`@utoo/pack` versions or file an issue.

### Restore-time failure

`egg-scripts start --snapshot-blob <blob>` (or `node --snapshot-blob`) restores
the heap. Common signatures:

| Symptom                                                                            | Meaning                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native fatal `Check failed: current == end_slot_index` mid-deserialization         | Restoring on **Node.js < 24**. Always restore on Node.js >= 24. `egg-scripts` refuses to launch when it can determine the target is < 24; a custom `--node` whose version it cannot read falls through to the in-snapshot guard below. |
| `[egg-bundler] V8 snapshot restore requires Node.js >= 24, but this process is vX` | The snapshot's own guard fired (you bypassed `egg-scripts`, or its version probe failed open).                                                                                                                                         |
| `Error: Cannot find module '<pkg>'`                                                | An **external** dependency is missing. Externals are `require()`'d live on restore, resolved from `worker.js`'s own directory — keep `worker.js` next to a `node_modules` that contains them.                                          |
| `Aop Advice(X) not found in loadUnits`                                             | A tegg decorated class kept the wrong source path in the bundle (see [tegg decorators](#tegg-aop-advice)).                                                                                                                             |
| A `TypeError` deep inside a library that "worked before bundling"                  | The library mishandled a build-time member-proxy stub (see [lazy-external edge cases](#lazy-external-edge-cases)).                                                                                                                     |
| `globalThis.fetch(...)` silently does nothing                                      | Web globals stay no-op stubs after restore (see [Known limitations](./snapshot.md#known-limitations)).                                                                                                                                 |
| `[egg-bundler] failed to restore snapshot: <err>`                                  | Any other error thrown while finishing the deferred lifecycle (`snapshotDidDeserialize` → `didReady` → `listen`).                                                                                                                      |

## Step 2 — Find the offending module (build failures)

### Check the build environment first

`egg-bin snapshot build` strips its _own_ TypeScript loader injection before
spawning `node --build-snapshot`, but it inherits the rest of your shell
environment. A `NODE_OPTIONS` that installs a custom loader or hook
(`--require ts-node/register`, `--loader …`, `--import …`) rides into the
snapshot-build child and can pull non-serializable state into the heap — the
build then aborts natively with **no application-level cause**. Build from a
clean environment first:

```bash
$ unset NODE_OPTIONS   # drop any inherited --require / --loader / --import
$ egg-bin snapshot build
```

### Turn on debug logging

Every stage of the bundler and launcher logs through `util.debuglog`. Enable the
relevant namespaces with `NODE_DEBUG`:

```bash
# the bundler pipeline (manifest → entry → pack → prelude)
$ NODE_DEBUG='egg/bundler/*,egg/bin/commands/snapshot' egg-bin snapshot build

# the launcher (restore gate, spawn)
$ NODE_DEBUG='egg/scripts/commands/start' egg-scripts start --snapshot-blob ./dist-bundle/snapshot.blob
```

Useful namespaces:

| Namespace                      | What it traces                                                       |
| ------------------------------ | -------------------------------------------------------------------- |
| `egg/bundler/bundler`          | bundle start, externals resolved, prelude/lazy-hook injection counts |
| `egg/bundler/entry-generator`  | collected bundle entries, generated worker entry path                |
| `egg/bundler/manifest-loader`  | what was discovered and externalized                                 |
| `egg/bundler/snapshot-prelude` | externals whose export names could not be read                       |
| `egg/bin/commands/snapshot`    | the exact `node --build-snapshot …` command spawned                  |

### Read the native abort directly

The build spawns the child with inherited stdio, so the V8 serializer's abort
already prints to your terminal. To iterate faster, run the wrapped command by
hand from the output directory — this is exactly what `egg-bin` runs:

```bash
$ cd ./dist-bundle
$ EGG_BUNDLE_SNAPSHOT=build \
    node --snapshot-blob ./snapshot.blob --build-snapshot ./worker.js
```

When the serializer aborts it usually names the object type it could not encode
(for example a native handle), and the surrounding stack points into the module
that created it. That is your prime suspect.

To print that exact command (including any global exec args) **without** running
it, use `egg-bin snapshot build --dry-run` — it bundles, then logs the precise
`node --snapshot-blob … --build-snapshot worker.js` invocation instead of
spawning it.

### Bisect with `--skip-bundle`

`--skip-bundle` re-runs **only** the snapshot step over an existing
`worker.js`, skipping the (slow) bundling. Because the bundle is a single
self-contained file, you can comment an `import`/`require` out of `worker.js` and
re-run the snapshot step in seconds:

```bash
# 1. bundle once
$ egg-bin snapshot build --output ./dist-bundle
# 2. edit ./dist-bundle/worker.js — comment out a suspect module's evaluation
# 3. re-run just the snapshot build
$ egg-bin snapshot build --output ./dist-bundle --skip-bundle
```

If removing a module's evaluation makes the blob build, that module is the
culprit.

### Confirm with `--force-external`

Pushing a suspect package **out** of the bundle is both a diagnostic and a fix.
An external is never evaluated at build time — it is `require()`'d live on
restore — so if `--force-external <pkg>` makes the build succeed, that package
was capturing unserializable state at import:

```bash
$ egg-bin snapshot build --force-external some-native-client
```

## Step 3 — Fix it

Pick the lightest fix that applies, roughly in this order.

### 1. Keep the package external

Best for a third-party package that opens connections, starts timers, or loads a
native addon at import. It stays out of the snapshot and is required for real on
restore:

```bash
$ egg-bin snapshot build \
    --force-external undici \
    --force-external some-native-driver
```

The package (and its own dependencies) must be **installed at the deploy
target**, since it is loaded at runtime, not baked into the blob. The inverse
flag, `--inline-external <pkg>`, forces a package the resolver auto-externalized
back into the bundle.

### 2. Add a builtin to `egg.snapshot.lazyModules`

For a **builtin** (or builtin-like id) that initializes native state at import
but is not in the default lazy list, add it in `package.json`. It is merged onto
the defaults, stubbed at build, and loaded for real on restore:

```json
{
  "egg": {
    "snapshot": {
      "lazyModules": ["node:zlib", "node:perf_hooks"]
    }
  }
}
```

The built-in defaults already cover `http`, `https`, `http2`, `tls`, `dns`, and
`inspector` (with their `node:` forms) — you do not need to list those.

### 3. Implement the snapshot lifecycle hooks

When _your own_ boot code owns a resource that cannot be serialized (a timer, a
socket, a logger stream, a pooled connection), release it before serialization
and recreate it after restore:

```js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async snapshotWillSerialize() {
    // close/detach the non-serializable resource before the blob is written
    clearInterval(this.timer);
    this.timer = null;
  }

  async snapshotDidDeserialize() {
    // recreate it in the live, restored process
    this.timer = setInterval(() => this.app.doWork(), 1000);
  }
}

module.exports = AppBootHook;
```

See [Snapshot lifecycle hooks](./snapshot.md#snapshot-lifecycle-hooks) for the
full contract. In single-process snapshot mode an `agent.js` boot class's hooks
run too — the agent's `snapshotWillSerialize`/`snapshotDidDeserialize` fire
**before** the app's — so resources owned by `agent.js` need the same treatment,
and a `failed to restore snapshot` error can originate from an agent hook.

### 4. Defer the work out of module scope

Often the cleanest fix lives in your own code: move resource creation out of the
top-level module body and into a function that runs at request time (or inside
`didReady`/`snapshotDidDeserialize`). A module that only _defines_ classes and
functions at evaluation time is always snapshot-safe; one that _connects_ or
_starts a timer_ at evaluation time is not.

```js
// ✗ runs at module-eval → captured in the snapshot
const client = new SomeClient({ keepAlive: true });

// ✓ created on first use, in the live process
let client;
function getClient() {
  return (client ??= new SomeClient({ keepAlive: true }));
}
```

### 5. Avoid the web globals

`globalThis.fetch` and the other undici-backed globals remain **no-op stubs**
after restore (Node's lazy getter cannot be re-installed into a restored heap).
Use a lazily-loaded HTTP client instead — `urllib` or `undici` kept external and
required for real on restore:

```js
// ✗ no-op after restore
await fetch(url);

// ✓ real client, loaded live on restore
const { request } = require('urllib');
await request(url);
```

## Failure modes in detail

### tegg decorators: "Aop Advice not found" {#tegg-aop-advice}

tegg decorators (`@SingletonProto`, `@HTTPController`, `@Advice`, …) capture a
class's source path from the call stack at module evaluation, using a hardcoded
stack depth. In a bundle every user frame collapses onto `worker.js`, so a
decorator that reads a _deeper_ frame than the norm (notably `@Advice`) captures
`worker.js` instead of its own file, and tegg cannot match the proto to its load
unit at restore.

The bundler corrects this automatically: it re-stamps each decorated export's
`filePath` from the manifest's tegg `decoratedFiles` before serialization. If you
write a **custom decorator** that captures a stack frame at an unusual depth and
hit this error, make sure the decorated file is part of a tegg module (so it
appears in `decoratedFiles`), or file an issue with the decorator's stack depth.

### Lazy-external edge cases {#lazy-external-edge-cases}

External modules are represented at build time by a **member-proxy**: a stub that
records the property/call/construct path taken against it (so
`class X extends pkg.Base {}` and `DataTypes.INTEGER(11).UNSIGNED` keep working)
and replays that path against the real module on restore.

The proxy is faithful for the common patterns, but a library that does something
unusual with a value it received at build time — for example coercing it to a
string in an error template, or branching on an exotic `typeof` — can mishandle
the stub and throw a confusing `TypeError`. If you see an error like
`String.prototype.toString requires that 'this' be a String` originating inside a
dependency during restore, the dependency received a member-proxy where it
expected a concrete value. Keeping that dependency `--force-external` (so it is
never proxied) is the reliable fix.

### Missing files at request time (runtime assets) {#runtime-assets}

A snapshot that restores cleanly can still `ENOENT` later when a handler reads a
file. Only **non-source files under `app/`** (plus the force-copy dirs
`app/public`, `app/assets`, `app/static`) are copied next to `worker.js`.
Source-extension files (`.ts`/`.js`/`.json`/…), assets outside `app/`, and
symlinked assets are **not** copied. And because the bundle rewrites `__dirname`
and `import.meta.url` to the output directory, a module doing
`fs.readFileSync(path.join(__dirname, 'tpl.html'))` or
`new URL('./x', import.meta.url)` resolves against the bundle output dir — if the
file was never copied there, it fails at request time, not at build or restore.

Declare the extra assets in `module.yml` so they are copied into the bundle:

```yaml
bundle:
  runtimeAssets:
    roots: ['app', 'resources']
    forceCopyDirs: ['app/public', 'resources/templates']
```

### Build succeeds, blob is missing

`node --build-snapshot` can exit `0` without writing a blob — for instance if the
entry threw after the `snapshotWillSerialize` hooks but before
`setDeserializeMainFunction`. `egg-bin snapshot build` checks for the blob and
fails loudly with `snapshot build finished but no blob was written at <path>`.
Re-run with `NODE_DEBUG` and inspect the worker's own output for the underlying
error.

## Configuration reference

| Mechanism                                              | Where                                      | Use it for                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `--force-external <pkg>`                               | `egg-bin snapshot build` flag (repeatable) | Keep a package out of the bundle; load it live on restore.                                                                  |
| `--inline-external <pkg>`                              | `egg-bin snapshot build` flag (repeatable) | Force an auto-externalized package back into the bundle.                                                                    |
| `egg.snapshot.lazyModules`                             | app `package.json`                         | Add a builtin/builtin-like id to the lazy-external set (merged onto the defaults).                                          |
| `snapshotWillSerialize()` / `snapshotDidDeserialize()` | `app.js` / `agent.js` boot class           | Release & recreate resources your own code owns.                                                                            |
| `--pack-alias <spec>=<target>`                         | `egg-bin snapshot build` flag (repeatable) | Redirect a module specifier during bundling.                                                                                |
| `--skip-bundle`                                        | `egg-bin snapshot build` flag              | Re-run only the snapshot step over an existing `worker.js`.                                                                 |
| `--dry-run`                                            | `egg-bin snapshot build` flag              | Print the `node --build-snapshot` command without spawning it.                                                              |
| `bundle.runtimeAssets.roots` / `forceCopyDirs`         | app `module.yml`                           | Copy extra non-source files into the bundle so they exist at request time.                                                  |
| `--no-sourcemap`                                       | `egg-scripts start` flag                   | Drop the auto-injected `--import source-map-support/register` from the restore launch (TypeScript apps) when it interferes. |
| `NODE_OPTIONS`                                         | environment variable                       | Must be free of custom `--loader`/`--require`/`--import` before a build (they ride into the snapshot child).                |
| `NODE_DEBUG=egg/bundler/*`                             | environment variable                       | Trace the bundler/launcher pipeline.                                                                                        |

For the build/restore workflow and the supported surface, see the main
[V8 Startup Snapshot](./snapshot.md) page.
