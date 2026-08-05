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
from a self-contained bundle, so a snapshot is essentially a pre-booted bundle.
Single-process mode produces one bundle and one blob. Cluster mode produces
independent app and agent bundles, each with its own blob and V8 heap.

## Node.js version requirements

| Phase                              | Command                                                   | Node.js |
| ---------------------------------- | --------------------------------------------------------- | ------- |
| **Build** a snapshot               | `egg-bin snapshot build`                                  | >= 22   |
| Run an ordinary cluster bundle     | `egg-scripts start --bundle` without role snapshot blobs  | >= 22   |
| **Restore** a snapshot-backed heap | `--snapshot-blob`, or `--bundle` with role snapshot blobs | >= 24   |

::: warning Restoring requires Node.js >= 24
A snapshot can be **built** on Node.js >= 22, but **restoring** a non-trivial Egg
heap on Node.js 22 aborts the process during deserialization with a native fatal
error (`Check failed: current == end_slot_index`, a V8 bug). Always restore on
Node.js **>= 24**.

The supported launcher enforces this for both the single-process
`--snapshot-blob` path and cluster `--bundle` launches that provide role blobs:
it refuses to launch on Node.js < 24 with a clear error before spawning
anything. If you bypass it and run `node --snapshot-blob` directly on Node.js
22, the process still aborts mid-deserialization with the native fatal above —
the snapshot's own runtime guard can only print a friendly message on a runtime
new enough to finish deserializing but still below 24. So always restore through
`egg-scripts` on Node.js >= 24.
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
`./dist-bundle/snapshot.blob`.

To build independent app and agent snapshots for cluster mode:

```bash
$ egg-bin snapshot build --cluster
```

This writes `app_worker.js`, `agent_worker.js`, `app.snapshot.blob`, and
`agent.snapshot.blob` under `./dist-bundle`. Useful options:

| Option                         | Description                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `--output <dir>`               | Bundle output directory.                                                      |
| `--cluster`                    | Build separate app and agent worker bundles and blobs.                        |
| `--blob <path>`                | Single-process blob path. Defaults to `<output>/snapshot.blob`.               |
| `--app-snapshot-blob <path>`   | Cluster app blob path. Defaults to `<output>/app.snapshot.blob`.              |
| `--agent-snapshot-blob <path>` | Cluster agent blob path. Defaults to `<output>/agent.snapshot.blob`.          |
| `--force-external`             | Package to always keep external, repeatable (see Limitations).                |
| `--skip-bundle`                | Rebuild blobs from existing snapshot-ready worker entries without rebundling. |

### Restore and serve

Start a process directly from the blob with `egg-scripts` (Node.js >= 24):

```bash
$ egg-scripts start --snapshot-blob ./dist-bundle/snapshot.blob --port 7001
```

This launches a single self-contained `node --snapshot-blob <blob>` process (no
egg-cluster, no framework resolution). The snapshot main reads the listen port
from `PORT` (or `--port`), runs `snapshotDidDeserialize` hooks, and calls
`app.listen()`.

For cluster mode, enable the bundle worker entries and provide either or both
role blobs:

```bash
$ egg-scripts start --bundle \
    --app-snapshot-blob ./dist-bundle/app.snapshot.blob \
    --agent-snapshot-blob ./dist-bundle/agent.snapshot.blob
```

`--bundle-dir` defaults to `./dist-bundle`. The app and agent blobs are
independent: when only one is provided, that role restores from its blob and the
other role starts from its generated bundle JavaScript. Snapshot-backed cluster
workers require process mode; ordinary cluster bundles without blobs can also
use `worker_threads`.

## Programmatic API

For custom single-process entry files, Egg also exports two helpers from `egg`:

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

These helpers represent one application heap. The cluster workflow uses the CLI
to generate and restore the role-specific app and agent entries instead.

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

In cluster mode, the app and agent workers run this sequence independently.
Each blob captures the heap built by its role-specific entry, and each restored
process resumes that role's lifecycle and communication protocol.

The set of modules kept external and lazy defaults to the Node network stack
(`http`, `https`, `http2`, `tls`, `dns`), `inspector`, and `cluster`, with their
`node:` forms, plus `undici` and `urllib`. If another builtin or package
initializes native state at import, extend the set via
`egg.snapshot.lazyModules` in the app `package.json`:

```json
{
  "egg": {
    "snapshot": {
      "lazyModules": ["node:zlib"]
    }
  }
}
```

When a third-party dependency or builtin breaks the build or restore, see
[Snapshot Troubleshooting](./snapshot-troubleshooting.md) for how to find the
offending module and fix it.

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

The following numbers measure the single-process path. Because the module graph
is already loaded and the app is booted up to `configWillLoad`, restore only
pays for `didReady` and connecting/listening.
Measured on [cnpmcore](https://github.com/cnpm/cnpmcore):

| Process model  | Boot mode          | Restore → listening  |
| -------------- | ------------------ | -------------------- |
| Single process | Normal bundle boot | ~942 ms              |
| Single process | Snapshot restore   | ~233 ms (~4x faster) |

Cluster readiness includes master, agent, and app-worker coordination and was
not measured in this sample, so these single-process numbers should not be used
as cluster-mode timings.

The win grows with the size of the module graph (plugins, tegg modules, routers),
which is exactly the cost a snapshot front-loads into build time.

## Known limitations

- **Restore requires Node.js >= 24** (see above).
- **Cluster snapshot blobs require process mode**: ordinary cluster bundles
  support `worker_threads`, but Node cannot restore a custom V8 startup blob
  inside a worker thread.
- **Snapshot and bundled-cluster bootstrap modules are unsupported**: a
  `--snapshot-blob` launch or bundled cluster launch that uses `options.require`
  fails before workers are spawned.
- **Native addons are external** and must be present in the deploy target.
- **Third-party dependencies are constrained**: any dependency that opens live
  resources or captures non-serializable state at module-evaluation time (open
  sockets, native HTTP/2 bindings, background timers, file handles) must either
  be kept external (`--force-external`) or implement the snapshot lifecycle hooks
  so its state is released before serialization and rebuilt after restore. Not
  every package is snapshot-safe out of the box.
- **Web globals must be referenced at call time**: the undici-backed globals
  (`fetch`/`Headers`/`Request`/`Response`/`FormData`/`WebSocket`/...) are stubbed at
  build time (touching them pulls in undici's non-serializable native bindings) and
  re-installed on restore, so call-time use works. But a reference captured at
  module-evaluation time — `const f = fetch`, or `class X extends globalThis.Request` —
  freezes the build-time stub into the blob and is not upgraded. Reference web globals
  where you use them, not at module top level.

The supported surface is still evolving; the full list of known limitations and
the design rationale are tracked in the project's V8 snapshot RFC.

## Troubleshooting

If a snapshot fails to build (a native abort during serialization) or fails to
restore, see [Snapshot Troubleshooting](./snapshot-troubleshooting.md). It covers
the build-time vs restore-time error signatures, how to find the module that
captured non-serializable state, and the available fixes
(`--force-external`, `egg.snapshot.lazyModules`, lifecycle hooks).
