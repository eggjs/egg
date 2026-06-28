---
title: V8 Startup Snapshot
order: 7
---

# V8 Startup Snapshot

Egg can freeze a fully-loaded application into a [V8 startup snapshot](https://nodejs.org/api/cli.html#--build-snapshot)
so that cold start skips most of the boot work. Building a snapshot loads the
entire module graph — framework metadata, plugins, services, routers, and tegg
modules — and runs the lifecycle up to `configWillLoad`, then serializes that
heap into a blob. Restoring the blob resumes the remaining lifecycle (`didReady`)
and starts listening, so the process is ready to serve traffic almost
immediately.

This builds on [Bundle Deployment](../core/bundle.md): the snapshot is produced
from a single self-contained bundle, so a snapshot is essentially a pre-booted
bundle.

## Node.js version requirements

| Phase                | Command                             | Node.js |
| -------------------- | ----------------------------------- | ------- |
| **Build** a snapshot | `egg-bin snapshot build`            | >= 22   |
| **Restore** (run)    | `egg-scripts start --snapshot-blob` | >= 24   |

::: warning Restoring requires Node.js >= 24
A snapshot can be **built** on Node.js >= 22, but **restoring** a non-trivial Egg
heap on Node.js 22 aborts the process during deserialization with a native fatal
error (`Check failed: current == end_slot_index`, a V8 bug). Always restore on
Node.js **>= 24**.

The supported launcher enforces this: `egg-scripts start --snapshot-blob` refuses
to launch on Node.js < 24 with a clear error before spawning anything. If you
bypass it and run `node --snapshot-blob` directly on Node.js 22, the process still
aborts mid-deserialization with the native fatal above — the snapshot's own
runtime guard can only print a friendly message on a runtime new enough to finish
deserializing but still below 24. So always restore through `egg-scripts` on
Node.js >= 24.
:::

## Build and restore with the CLI

The recommended workflow uses the bundler CLI. There is no `egg-bin snapshot
start`: building is a build-time concern (`egg-bin`), and restoring is a
production-runtime concern (`egg-scripts`).

### Build the blob

```bash
# bundles the app in snapshot mode (single self-contained worker.js + prelude)
# and runs `node --snapshot-blob <blob> --build-snapshot worker.js` for you
$ egg-bin snapshot build
```

By default this writes the bundle to `./dist-bundle` and the blob to
`./dist-bundle/snapshot.blob`. Useful options:

| Option             | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `--output <dir>`   | Bundle output directory (also where `worker.js` lives).        |
| `--blob <path>`    | Snapshot blob path. Defaults to `<output>/snapshot.blob`.      |
| `--force-external` | Package to always keep external, repeatable (see Limitations). |
| `--skip-bundle`    | Build the blob from an existing `worker.js` (skip bundling).   |

### Restore and serve

Start a process directly from the blob with `egg-scripts` (Node.js >= 24):

```bash
$ egg-scripts start --snapshot-blob ./dist-bundle/snapshot.blob --port 7001
```

This launches a single self-contained `node --snapshot-blob <blob>` process (no
egg-cluster, no framework resolution). The snapshot main reads the listen port
from `PORT` (or `--port`), runs `snapshotDidDeserialize` hooks, and calls
`app.listen()`.

## Programmatic API

For custom entry files, Egg also exports two helpers from `egg`:

```ts
import { buildSnapshot, restoreSnapshot } from 'egg';
```

- `buildSnapshot()` starts Egg in snapshot mode, loads metadata, triggers cleanup
  hooks for non-serializable resources, and registers the application object into
  the V8 snapshot payload.
- `restoreSnapshot()` restores the application from that payload, recreates
  runtime-only resources, and resumes the remaining Egg lifecycle.

Build entry:

```ts
import { buildSnapshot } from 'egg';

await buildSnapshot({
  baseDir: import.meta.dirname,
});
```

```bash
node --snapshot-blob=snapshot.blob --build-snapshot snapshot-entry.mjs
```

Restore entry (Node.js >= 24):

```ts
import { restoreSnapshot } from 'egg';

const app = await restoreSnapshot();
await app.listen(7001);
```

`restoreSnapshot()` resumes the normal startup flow from `configDidLoad` through
`didReady`, so the returned app is ready for runtime setup such as creating
servers or opening external connections.

## How it works

During snapshot build, Egg runs with `snapshot: true`. In this mode Egg loads
application metadata but **stops after `configWillLoad`**, so hooks such as
`configDidLoad`, `didLoad`, `willReady`, `didReady`, and `serverDidReady` are
deferred until restore time. Before the heap is serialized, Egg runs
`snapshotWillSerialize` hooks to release non-serializable resources (timers,
sockets, native handles, logger streams). The network stack (`node:http`,
`node:https`, TLS/DNS, the HTTP client) is kept **external and lazy** so its
non-serializable native bindings are never captured in the blob; they are
reconnected on first use after restore.

At restore time V8 deserializes the heap, then the snapshot main runs
`snapshotDidDeserialize` hooks to recreate those runtime-only resources, finishes
the deferred lifecycle through `didReady`, and starts listening.

## Snapshot lifecycle hooks

If your `app.js` or `agent.js` boot class manages resources that cannot be
serialized into a V8 snapshot, implement these hooks:

```js
class AppBootHook {
  async snapshotWillSerialize() {
    // close or detach non-serializable resources before the snapshot is written
  }

  async snapshotDidDeserialize() {
    // recreate those resources after the snapshot is restored
  }
}

module.exports = AppBootHook;
```

- `snapshotWillSerialize()` runs before the snapshot is written.
- `snapshotDidDeserialize()` runs after the process starts from the snapshot.

Use these hooks for resources such as timers, sockets, process listeners,
loggers, or other handles that must be recreated in a live runtime.

## Performance

Because the module graph is already loaded and the app is booted up to
`configWillLoad`, restore only pays for `didReady` and connecting/listening.
Measured on [cnpmcore](https://github.com/cnpm/cnpmcore):

| Boot mode          | Restore → listening  |
| ------------------ | -------------------- |
| Normal bundle boot | ~942 ms              |
| Snapshot restore   | ~233 ms (~4x faster) |

The win grows with the size of the module graph (plugins, tegg modules, routers),
which is exactly the cost a snapshot front-loads into build time.

## Known limitations

- **Restore requires Node.js >= 24** (see above).
- **Single process only**: the snapshot runs as one self-contained process
  (`mode: 'single'`), like a bundle. Cluster mode is not supported.
- **Native addons are external** and must be present in the deploy target.
- **Third-party dependencies are constrained**: any dependency that opens live
  resources or captures non-serializable state at module-evaluation time (open
  sockets, native HTTP/2 bindings, background timers, file handles) must either
  be kept external (`--force-external`) or implement the snapshot lifecycle hooks
  so its state is released before serialization and rebuilt after restore. Not
  every package is snapshot-safe out of the box.
- **Web globals are no-op stubs after restore**: at build the prelude replaces the
  undici-backed globals (`fetch`/`Headers`/`Request`/`Response`/`FormData`/`WebSocket`,
  plus `Blob`/`File`) with no-op stubs, because touching them at build time pulls in
  Node's built-in undici and its native http/http2 bindings (which a snapshot cannot
  serialize). Node's native lazy getters are themselves not snapshot-serializable, so
  they cannot be reinstated on restore. **In the restored process those globals stay
  stubs** — a snapshotted app should use a lazy-loaded HTTP client (e.g. `urllib`/`undici`
  via an external, loaded for real on restore) rather than `globalThis.fetch` directly.

The supported surface is still evolving; the full list of known limitations and
the design rationale are tracked in the project's V8 snapshot RFC.
