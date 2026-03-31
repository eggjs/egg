# Egg.js V8 Startup Snapshot Design

## Overview and Goals

Node.js V8 startup snapshots (`--build-snapshot` / `--snapshot-blob`) allow serializing the V8 heap after initialization, then restoring it on subsequent starts. This eliminates module loading, parsing, compilation, and initialization work -- dramatically reducing cold-start time.

**Goals for Egg.js snapshot support:**

1. Support single-process mode snapshot build and restore via `egg-scripts`
2. Pre-compute as much initialization as possible: module require cache, config parsing, plugin loading, middleware chain setup, controller/service class loading, tegg metadata (GlobalGraph)
3. Defer runtime-dependent resources: `server.listen()`, DB connections, file watchers, timers, loggers (file handles), `AsyncLocalStorage`
4. Keep changes modular -- each package owns its own snapshot awareness
5. **No bundling required** -- run egg's full loader during snapshot build, capture post-loader state

## Node.js Snapshot API Summary

### Key APIs

| API                                                       | Purpose                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `v8.startupSnapshot.isBuildingSnapshot()`                 | Returns `true` during snapshot build phase                          |
| `v8.startupSnapshot.addSerializeCallback(fn, data)`       | Cleanup before snapshot is taken (close handles, release resources) |
| `v8.startupSnapshot.addDeserializeCallback(fn, data)`     | Restore after snapshot loads (reopen handles, reinitialize)         |
| `v8.startupSnapshot.setDeserializeMainFunction(fn, data)` | Set the entry point for deserialized app (called once)              |
| `--build-snapshot`                                        | CLI flag to build snapshot blob                                     |
| `--snapshot-blob=path`                                    | CLI flag to load snapshot blob                                      |
| `--build-snapshot-config=path`                            | JSON config for snapshot build (builder script, withoutCodeCache)   |

### Critical Limitations

1. **Single entry file required**: `--build-snapshot` loads one script. However, that script can dynamically `import()` other modules -- full bundling is NOT needed. Egg's loader runs normally during snapshot build, and the entire post-load state is captured in the heap. See "Bundling Decision" section below.
2. **No open handles at snapshot time**: Sockets, timers (`setTimeout`/`setInterval`), file descriptors, file watchers must be cleaned up before serialization.
3. **No `AsyncLocalStorage`**: Cannot be serialized -- must be deferred to deserialize callback (already handled in `@eggjs/koa`).
4. **`process.env` and `process.argv` refresh**: These are updated to runtime values during deserialization -- config that reads `process.env` at build time will be stale unless re-read.
5. **Cannot re-snapshot**: A deserialized app cannot build another snapshot.
6. **Built-in module subset**: Not all Node.js built-in modules serialize correctly. Known safe: `fs`, `path`, `util`, `url`, `assert`, `buffer`, `crypto`, `zlib`. Potentially problematic: `http` (if server created), `net`, `dgram`.

### Lifecycle

```
BUILD PHASE:
  1. node --snapshot-blob snap.blob --build-snapshot entry.js
  2. entry.js executes: loads modules, builds app state
  3. addSerializeCallback()s run: cleanup handles
  4. V8 serializes heap to snap.blob
  5. Process exits

RESTORE PHASE:
  1. node --snapshot-blob snap.blob [optional-entry.js]
  2. V8 deserializes heap from snap.blob
  3. process.env / process.argv refreshed to runtime values
  4. addDeserializeCallback()s run: restore resources
  5. setDeserializeMainFunction() callback runs: start app
```

## Architecture

### What Gets Captured in the Snapshot

These are **I/O-heavy or compute-heavy** operations that happen once and produce deterministic results:

| Component               | What's Captured                                                         | Package              |
| ----------------------- | ----------------------------------------------------------------------- | -------------------- |
| Module require cache    | All `require()`/`import()` calls for framework, plugins, app code       | Node.js built-in     |
| Plugin resolution       | Plugin paths, ordering (`loader.orderPlugins`)                          | `@eggjs/core`        |
| Config parsing          | Merged config from all layers (plugin + framework + app + env-specific) | `@eggjs/core`        |
| Extend loading          | Application/Request/Response/Context/Helper extensions                  | `@eggjs/core`        |
| Middleware classes      | Middleware factory functions loaded from disk                           | `packages/egg`       |
| Controller classes      | Controller classes loaded and bound                                     | `packages/egg`       |
| Service classes         | Service class definitions (lazy-instantiated per request)               | `packages/egg`       |
| Router definition       | Route table compiled from `app/router.ts`                               | `packages/egg`       |
| Tegg GlobalGraph        | Module descriptors, dependency graph, topological sort                  | `tegg/core/metadata` |
| Tegg prototype metadata | Decorator metadata, inject mappings, qualifier resolutions              | `tegg/core/metadata` |

### What Must Be Deferred to Runtime

These resources are either **environment-dependent** or **non-serializable**:

| Resource                             | Why Deferred                            | Restore Strategy                                   |
| ------------------------------------ | --------------------------------------- | -------------------------------------------------- |
| `AsyncLocalStorage`                  | Cannot serialize                        | `addDeserializeCallback` (already in `@eggjs/koa`) |
| Loggers (file handles)               | Open FDs                                | Re-create in deserialize callback                  |
| `server.listen()`                    | Network socket                          | Called in `setDeserializeMainFunction`             |
| Agent keepalive timer                | `setInterval`                           | Re-create in deserialize callback                  |
| `process.on('unhandledRejection')`   | Process listener                        | Re-register in deserialize callback                |
| Timeout timer (`#setupTimeoutTimer`) | `setTimeout`                            | Skip or re-create at runtime                       |
| `cluster-client` connections         | Network socket                          | Defer creation to runtime                          |
| `process.env` reads                  | Values change between build and runtime | Re-read config env overrides in deserialize        |
| DB/Redis connections                 | Network handles                         | Plugins defer connections to `serverDidReady`      |
| File watchers (development plugin)   | FD handles                              | Not relevant in prod                               |
| `egg-ready` messenger event          | Tied to runtime lifecycle               | Fire in deserialize main function                  |

### Bundling Decision

**Full single-file bundling of egg is NOT feasible.** Egg relies on runtime filesystem scanning (`globby.sync`) and dynamic `import()` for controllers, services, plugins, and config files. A bundler cannot follow these dynamic patterns.

**Approach: Run egg's full loader during snapshot build.** The `snapshot-build.mjs` entry script calls `startEgg()` which runs the entire loader (filesystem scanning, dynamic imports, plugin resolution, config merging, etc.). The resulting fully-initialized app state is captured in the V8 heap snapshot. On restore, the loader does NOT run again -- everything is already in memory.

This means:

- No utoo/esbuild bundle step needed
- The snapshot build machine needs the full app source and `node_modules`
- The snapshot blob captures all loaded modules in the V8 heap
- utoo bundling is an **optional optimization** to speed up module resolution during the build phase itself

### Architecture Diagram

```
                    BUILD TIME                          RUNTIME
                    ==========                          =======

  ┌──────────────────────┐
  │  User App (source)   │
  │  + node_modules      │
  │  + config/           │
  │  + app/              │
  └──────────┬───────────┘
             │
             ▼
  ┌───────────────────────┐
  │  snapshot-build.mjs   │
  │                       │
  │  1. startEgg(options) │  ← Full loader runs: filesystem scan,
  │     ├─ new Agent()    │    dynamic imports, plugin resolution,
  │     │  └─ loadConfig  │    config merging, etc.
  │     │  └─ load        │
  │     ├─ new Application│
  │     │  └─ loadConfig  │
  │     │  └─ load        │
  │     │    ├─ extends   │
  │     │    ├─ services  │
  │     │    ├─ middleware │
  │     │    ├─ controller │
  │     │    └─ router    │
  │     └─ await ready()  │
  │                       │
  │  2. Serialize cleanup:│
  │     ├─ Close loggers  │
  │     ├─ Clear timers   │
  │     ├─ Null ALS       │
  │     └─ Close messenger│
  │                       │
  │  3. Set main function:│
  │     → restore & listen│
  └───────────┬───────────┘
              │
    node --build-snapshot
              │
              ▼
       snapshot.blob          ← Contains entire V8 heap:
              │                  all modules, config, metadata,
    node --snapshot-blob         middleware chain, router, etc.
              │
              ▼
  ┌──────────────────┐
  │  Deserialize     │        ← NO loader runs, NO filesystem scan,
  │                  │          NO dynamic imports
  │  1. Restore ALS  │
  │  2. Reopen logs  │
  │  3. Re-read env  │
  │  4. Restart timer│
  │  5. http.listen()│
  │  6. egg-ready    │
  └──────────────────┘
```

## Module-by-Module Changes

### 1. `packages/koa` -- AsyncLocalStorage Deferral

**Status: ALREADY DONE**

The `@eggjs/koa` package already has snapshot support (similar to koajs/koa#1946):

- `ctxStorage` set to `null` during `isBuildingSnapshot()`
- `addDeserializeCallback` restores `ctxStorage` with `getAsyncLocalStorage()`
- `callback()` already handles `ctxStorage === null` gracefully
- Type: `ctxStorage: AsyncLocalStorage<Context> | null`

**No changes needed.**

### 2. `packages/egg` -- Core Framework Snapshot Awareness

**Files to modify:**

#### `packages/egg/src/lib/egg.ts` (EggApplicationCore)

Add snapshot awareness to the constructor and load process:

- **Loggers**: During snapshot build, create loggers normally but register a serialize callback to close all log file handles, and a deserialize callback to re-create them.
- **Timeout timer** (`#setupTimeoutTimer`): Skip during snapshot build (no timeout needed for build phase). Re-register on deserialize.
- **`process.on('unhandledRejection')`**: Register in deserialize callback instead of during load.
- **Config env re-read**: Add a deserialize callback that re-reads `process.env.EGG_APP_CONFIG` and merges runtime env overrides.

Add a new method:

```typescript
/**
 * Register snapshot serialize/deserialize callbacks.
 * Called at end of load() when isBuildingSnapshot() is true.
 */
protected registerSnapshotCallbacks(): void {
  const v8 = require('node:v8');

  // Serialize: cleanup non-serializable resources
  v8.startupSnapshot.addSerializeCallback((app) => {
    // Close all loggers (file handles)
    for (const logger of app.loggers.values()) {
      logger.close();
    }
    // Clear timeout timer (if any)
    // Close messenger
    app.messenger.close();
  }, this);

  // Deserialize: restore resources
  v8.startupSnapshot.addDeserializeCallback((app) => {
    // Re-create loggers with runtime config
    app.#loggers = createLoggers(app);
    // Re-register unhandledRejection handler
    process.on('unhandledRejection', app._unhandledRejectionHandler);
    // Re-create messenger
    app.messenger = createMessenger(app);
    // Re-read env config overrides
    app.#reloadEnvConfig();
  }, this);
}
```

#### `packages/egg/src/lib/agent.ts` (Agent)

- **`#agentAliveHandler` setInterval**: Must be cleared in serialize callback and re-created in deserialize callback.

#### `packages/egg/src/lib/application.ts` (Application)

- **`#bindEvents`**: The `cookieLimitExceed` and `server` event listeners are set up during `load()`. These are EventEmitter listeners (serializable), but the `server` event should fire at runtime. No change needed -- listeners survive snapshot.
- **`onServer`**: Called at runtime when server is created. No change needed.

#### `packages/egg/src/lib/start.ts` (startEgg)

Add a new export for snapshot-aware startup:

```typescript
/**
 * Build snapshot: initialize app fully, then register snapshot callbacks.
 * Called by snapshot-builder.mjs during --build-snapshot.
 */
export async function buildSnapshot(options: StartEggOptions): Promise<SingleModeApplication> {
  const app = await startEgg(options);
  app.registerSnapshotCallbacks();
  app.agent.registerSnapshotCallbacks();
  return app;
}
```

### 3. `packages/core` -- Lifecycle and Loader

#### `packages/core/src/lifecycle.ts`

- **`#initReady` / `loadReady` / `bootReady`**: These are `Ready` instances used during startup. After `ready()` resolves, they are inert. They should survive snapshot fine.
- **Timing**: Timing data from build phase should be discarded on restore. Add deserialize callback to reset timing.

#### `packages/core/src/loader/egg_loader.ts`

- **`process.env` reads**: `getServerEnv()` reads `process.env.EGG_SERVER_ENV` and `process.env.NODE_ENV`. These values are baked into the snapshot at build time. If the runtime env differs, config will be wrong.
  - **Solution**: In the deserialize callback, allow an env override mechanism. For the initial POC, require that build-time and runtime env match (document this constraint). Future: add env-aware config reload.

- **File system reads**: All `fs.existsSync`, `readJSONSync`, `readJSON` calls happen during `loadConfig()` and `load()`. These complete before snapshot is taken. No issue.

### 4. `tools/scripts` -- egg-scripts Commands

#### New command: `snapshot-build`

Add `tools/scripts/src/commands/snapshot-build.ts`:

```
egg-scripts snapshot-build [--baseDir] [--framework] [--env]
```

This command:

1. Runs `generate-snapshot-entry.mjs` to scan the app and discover all dynamically-loaded modules (plugins, configs, extends, services, controllers, middleware, router)
2. Generates a static entry file that imports every discovered module and builds a module registry
3. Uses esbuild to bundle the generated entry into a single CJS file (required because `--build-snapshot` only supports CJS)
4. Spawns `node --snapshot-blob snapshot.blob --build-snapshot <bundled-entry.cjs>`
5. Outputs `snapshot.blob` in the app directory

Key esbuild plugins used during bundling:

- **`file-url-resolver`**: Resolves `file://` URL imports from the generated entry
- **`urllib-stub`**: Replaces `urllib` with a stub (avoids WebAssembly dependency during snapshot build; real urllib is restored at runtime via `createRequire`)
- **`http-defer`**: Defers `node:http` loading via a lazy Proxy (avoids registering native handles that V8 cannot serialize)

#### New script: `scripts/snapshot-builder.mjs`

The snapshot build entry point (loaded by the bundled CJS entry):

```javascript
import http from 'node:http';
import v8 from 'node:v8';
import { importModule } from '@eggjs/utils';

const options = JSON.parse(process.argv[2]);

// Load framework and initialize app in single mode
const framework = await importModule(options.framework);
const startEgg = framework.start ?? framework.startEgg;
const app = await startEgg({
  baseDir: options.baseDir,
  framework: options.framework,
  env: options.env,
  mode: 'single',
});

// Create HTTP server (but don't listen yet)
const server = http.createServer(app.callback());
app.emit('server', server);

// Let the framework register serialize/deserialize hooks
app.registerSnapshotCallbacks();
app.agent?.registerSnapshotCallbacks();

// Set the main function for restore
v8.startupSnapshot.setDeserializeMainFunction((data) => {
  const port = process.env.PORT || data.defaultPort;
  data.server.listen(port, () => {
    console.log(`Server started on port ${port}`);
    if (process.send) {
      process.send({ action: 'egg-ready', data: { port } });
    }
  });
}, { app, server, defaultPort: options.port ?? 7001 });
```

#### Modified command: `start` with `--snapshot-blob` flag

Add `--snapshot-blob` flag to `tools/scripts/src/commands/start.ts`:

```
eggctl start --snapshot-blob snapshot.blob
```

When `--snapshot-blob` is set, the start command spawns:

```bash
node --snapshot-blob snapshot.blob
```

The snapshot blob contains the `setDeserializeMainFunction` callback, so no additional entry script is needed at runtime.

### 5. `tegg/` -- Metadata Pre-computation

#### `tegg/plugin/tegg/src/app.ts` (TeggAppBoot)

The tegg plugin's startup flow in `didLoad()`:

1. `EggModuleLoader.load()` → scans filesystem, dynamic imports, builds GlobalGraph
2. `LoadUnitInstanceFactory.createLoadUnitInstance()` → instantiates singletons

For snapshot:

- **Step 1** completes during snapshot build. GlobalGraph, module descriptors, prototype metadata all live in memory and are serializable (plain objects, Maps, Sets).
- **Step 2** creates singleton instances. These are also in-heap objects that should survive snapshot, **unless** they hold non-serializable resources (DB connections, etc.).

**Key change**: Singletons that connect to external services (Redis, DB) typically do so in `@LifecycleInit` or `serverDidReady`. If they create connections during `didLoad`/`willReady`, those connections must be closed in serialize callback and reopened in deserialize callback.

**Approach**: Add snapshot hooks to `ModuleHandler`:

```typescript
if (v8.startupSnapshot?.isBuildingSnapshot?.()) {
  v8.startupSnapshot.addSerializeCallback(() => {
    // Close any singleton connections
    // GlobalGraph and metadata stay in memory (serializable)
  });
  v8.startupSnapshot.addDeserializeCallback(() => {
    // Re-initialize singletons that need runtime resources
    // Re-register lifecycle hooks if needed
  });
}
```

### 6. Bundling (NOT required)

**Key finding**: Full single-file bundling of egg is **not feasible** because egg relies on runtime filesystem scanning (`globby.sync`) and dynamic `import()` for controllers, services, plugins, and config. A bundler cannot follow these dynamic patterns.

**Instead**: The `snapshot-build.mjs` entry script is a small (~30 line) file that calls `startEgg()`. Egg's full loader runs during the snapshot build phase, dynamically importing all modules from disk. The V8 snapshot captures the entire heap including all loaded modules, so no bundling is needed.

**Optional optimization**: utoo could bundle static framework dependencies (egg, core, koa, plugins) into a single file to speed up the initial module resolution during the snapshot build phase itself. But this is an optimization, not a requirement. See `docs/utoo-bundling.md` for details.

## Snapshot Build Flow

```
1. Developer runs: eggctl snapshot-build --env prod

2. eggctl snapshot-build:
   a. Resolves baseDir, framework, env
   b. Runs generate-snapshot-entry.mjs to scan the app:
      - Discovers all plugins (from config/plugin.ts + node_modules)
      - Discovers all config, extend, service, middleware, controller files
      - Generates a static entry file with explicit imports for every module
      - Builds a __snapshotModuleRegistry map (filepath → module)
   c. Bundles the generated entry with esbuild to a single CJS file:
      - Resolves file:// URLs from the generated entry
      - Stubs urllib (avoids WebAssembly in snapshot build)
      - Defers node:http via lazy Proxy (avoids native handle registration)
   d. Spawns: node --snapshot-blob snapshot.blob \
                   --build-snapshot <bundled-entry.cjs>

3. Bundled entry executes (inside node --build-snapshot):
   a. Pre-loads all modules from the registry (no filesystem scan needed)
   b. Calls startEgg(options) — loader uses pre-loaded modules:
      - Creates Agent, loads config + plugins
      - Creates Application, loads config + plugins + extends + services + middleware + controllers + router
      - Tegg: scans modules, builds GlobalGraph, instantiates singletons
      - Awaits ready()
   c. Creates HTTP server (no listen) and wires app.callback()
   d. Registers serialize callbacks (cleanup handles: loggers, timers, messenger)
   e. Registers deserialize callbacks (restore: ALS, loggers, urllib, messenger)
   f. Calls setDeserializeMainFunction (the runtime entry that calls server.listen)

4. Node.js:
   a. Runs serialize callbacks
   b. Serializes entire V8 heap to snapshot.blob (~30MB)
   c. Exits
```

## Snapshot Restore/Startup Flow

```
1. Production start: eggctl start --snapshot-blob snapshot.blob

2. egg-scripts:
   a. Spawns: node --snapshot-blob snapshot.blob
   b. Sets runtime env vars: PORT, EGG_SERVER_TITLE, etc.

3. Node.js:
   a. Deserializes V8 heap from snapshot.blob
      (NO loader runs, NO filesystem scan, NO dynamic imports)
   b. Refreshes process.env and process.argv to runtime values
   c. Runs deserialize callbacks (in order registered):
      - Koa: restores AsyncLocalStorage
      - Egg: re-creates loggers, messenger, re-reads env config
      - Agent: re-creates keepalive timer
      - Tegg: re-initializes runtime resources
   d. Runs setDeserializeMainFunction:
      - Reads PORT from process.env (runtime value, not build-time)
      - Calls server.listen(port)
      - Emits 'server' event
      - Broadcasts 'egg-ready'

4. Server is ready to accept requests
   (Startup time: ~236ms snapshot vs ~1632ms cold start)
```

## Constraints and Limitations

1. **Single process mode only**: Snapshots work with `--single` mode. Cluster mode (master + workers) is not supported because each worker would need its own snapshot, and the master process manages worker lifecycle.

2. **Build env must match runtime env**: The config loaded during snapshot build is for a specific `EGG_SERVER_ENV`. Running a `prod`-built snapshot with `unittest` env will not work correctly. (Future: add env-aware config reload.)

3. **Full source required at build time**: The snapshot build machine needs the full app source and `node_modules` because egg's loader runs during the build. The snapshot blob is self-contained for runtime.

4. **Plugin compatibility**: Plugins that create non-serializable resources during `configDidLoad`/`didLoad`/`willReady` (before `serverDidReady`) must be made snapshot-aware. Most well-behaved plugins defer connections to `serverDidReady`.

5. **No hot reload**: Snapshot contains compiled code. Code changes require rebuilding the snapshot.

6. **Snapshot size**: The blob is ~30MB for a typical app (21 plugins, 295 modules). This is a one-time cost and still faster than parsing/compiling from source.

## PR Split Plan

### PR 1: `packages/koa` — AsyncLocalStorage deferral

- Defer `AsyncLocalStorage` creation during `isBuildingSnapshot()`
- Restore ALS in deserialize callback
- Handle `ctxStorage === null` gracefully in `callback()`

### PR 2: `packages/core` — Lifecycle snapshot option

- Add `snapshot` option to `EggCoreOptions` and `LifecycleOptions`
- Stop lifecycle after `didLoad` phase in snapshot mode (skip `willReady`/`didReady`)

### PR 3: `packages/utils` — Snapshot module registry

- Add module registry support in `importModule()` — use pre-loaded modules from `globalThis.__snapshotModuleRegistry` instead of dynamic imports
- Handle restricted `requireForUserSnapshot` in snapshot builder context

### PR 4: `packages/egg` — Metadata-only loading and snapshot callbacks

- Add `metadataOnly` option to skip timers, event listeners, process handlers
- `registerSnapshotCallbacks()` for serialize/deserialize hooks (loggers, messenger, agent keepalive timer, urllib restoration)
- New `buildSnapshot()` / `restoreSnapshot()` APIs in `src/lib/snapshot.ts`
- New `startEggForSnapshot()` in `src/lib/start.ts`

### PR 5: `tools/scripts` — Snapshot build and single-mode commands

- `eggctl snapshot-build` command: generate entry → esbuild bundle → `node --build-snapshot`
- `eggctl start --snapshot-blob` flag for starting from snapshot
- `eggctl start --single` for single-process mode
- `scripts/generate-snapshot-entry.mjs`, `scripts/snapshot-builder.mjs`, `scripts/start-single.mjs`
- E2E tests with a fixture app

### PR 6: CI workflow and design documents

- `test-snapshot` job in GitHub Actions (Node.js 22+24, Ubuntu)
- Architecture design document (`docs/snapshot-design.md`)
- Test strategy document (`docs/snapshot-test-plan.md`)
- Bundling feasibility analysis (`docs/utoo-bundling.md`)

## Open Questions

1. **Config reload on restore**: Should we fully reload config from disk on deserialize, or just merge `process.env` overrides? Full reload is safer but negates some snapshot benefits. Current approach: require build-time and runtime env to match (documented constraint).

2. **Tegg singleton lifecycle**: How to handle singletons that need `@LifecycleInit` re-execution on restore? Need to identify which lifecycle hooks should re-run.

3. **Snapshot portability**: Should we support building on CI and deploying to different machines? This requires `--build-snapshot-config` with `withoutCodeCache: true` for cross-platform compatibility.

## Resolved Decisions

1. **Bundle strategy**: Resolved — `generate-snapshot-entry.mjs` scans the app to discover all modules, then esbuild bundles everything into a single CJS file. No utoo bundling needed. esbuild plugins handle `urllib` (stub), `node:http` (lazy proxy), and `file://` URLs.

2. **Entry generation approach**: Resolved — a two-phase approach: (1) scan at build time to generate a static entry with explicit imports, (2) esbuild bundles the entry to CJS for `--build-snapshot` compatibility.
