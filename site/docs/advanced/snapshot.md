---
title: V8 Startup Snapshot
order: 7
---

# V8 Startup Snapshot

Egg provides built-in helpers for building and restoring a V8 startup snapshot. This can reduce cold-start overhead for applications that need to preload framework metadata, plugins, services, routers, and tegg modules before serving traffic.

## Public APIs

Egg exports two public helpers from `egg`:

```ts
import { buildSnapshot, restoreSnapshot } from 'egg';
```

- `buildSnapshot()` starts Egg in snapshot mode, loads metadata, triggers cleanup hooks for non-serializable resources, and registers the application object into the V8 snapshot payload.
- `restoreSnapshot()` restores the application from that payload, recreates runtime-only resources, and resumes the remaining Egg lifecycle.

## Build a Snapshot

Create a snapshot entry file:

```ts
import { buildSnapshot } from 'egg';

await buildSnapshot({
  baseDir: import.meta.dirname,
});
```

Then build the blob with Node.js:

```bash
node --snapshot-blob=snapshot.blob --build-snapshot snapshot-entry.mjs
```

During snapshot build, Egg runs with `snapshot: true`. In this mode Egg loads application metadata but stops after `configWillLoad`, so hooks such as `configDidLoad`, `didLoad`, `willReady`, `didReady`, and `serverDidReady` are deferred until restore time.

## Restore a Snapshot

Start a process from the generated blob, then restore the application:

```ts
import { restoreSnapshot } from 'egg';

const app = await restoreSnapshot();
await app.listen(7001);
```

`restoreSnapshot()` resumes the normal startup flow from `configDidLoad` through `didReady`, so the returned app is ready for runtime setup such as creating servers or opening external connections.

## Snapshot Lifecycle Hooks

If your `app.js` or `agent.js` boot class manages resources that cannot be serialized into a V8 snapshot, implement these hooks:

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

Use these hooks for resources such as timers, sockets, process listeners, loggers, or other handles that must be recreated in a live runtime.
