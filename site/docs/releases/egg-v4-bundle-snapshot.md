---
title: 'Bundles and Startup Snapshots'
description: 'Build, restore, and measure Egg 4 startup artifacts'
---

# Bundles and Startup Snapshots

An Egg application with many dependencies and plugins spends its cold start discovering files, resolving modules, compiling and evaluating JavaScript, and initializing runtime resources. Scaling out or frequently starting short-lived processes repeats these fixed costs. Egg 4 addresses them in layers: Manifest reuses discovery results, compile cache reuses compilation results, bundles organize deployable module graphs ahead of time, and V8 snapshots save startup state that has already been executed.

Bundles and snapshots require explicit enablement. Validate ordinary bundle deployment first, then measure the snapshot's cold-start benefit in your application.

## Four layers of startup optimization

Manifest caches discovered files, module resolution results, and Tegg metadata in .egg/manifest.json by default. Subsequent starts can use known lists instead of repeating filesystem queries and glob scans. Before loading, the framework checks version, serverEnv, serverScope, TypeScript state, the lockfile fingerprint, and the configuration-directory fingerprint. Missing, corrupt, or invalid caches fall back to normal discovery. These fingerprints do not include full content hashes for arbitrary business source files.

Manifest is skipped in local by default unless EGG_MANIFEST=true. In other environments, a cache miss leads to asynchronous generation after ready. Build tools can also collect a manifest in metadataOnly mode: it runs loadMetadata(), skips agent and normal boot lifecycle execution, and exits after generation. beforeClose does not run either. A dedicated manifest-generation entry should therefore complete its work without depending on ordinary boot or shutdown hooks.

Coordinate cache delivery with the build process. Regenerate and verify the manifest if module layout changes after generation or build and runtime configurations differ. For misses, check environment and fingerprints; for omitted files, compare the manifest with ordinary discovery. Keeping the normal discovery fallback supports gradual adoption.

Node compile cache addresses a different cost. Egg enables it in ordinary startup entry points, defaulting to .egg/compile-cache and respecting existing NODE_COMPILE_CACHE or NODE_DISABLE_COMPILE_CACHE settings. Reusable compilation results persist on disk, and the cache is flushed at ready and close. Module evaluation and application initialization still execute. Snapshot builds skip this enable path.

Bundles move file discovery and module organization to build time, with runtime loading from an inline module map. Snapshots build on bundles, writing the heap after module preloading and completion of configWillLoad to a blob. These layers can work together, but record each enabled layer in deployment experiments to identify where benefits or failures originate.

## Bundles preserve module and resource boundaries

[@eggjs/egg-bundler](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bundler/README.md) uses @utoo/pack to build deployment artifacts. Its default single-process entry is CommonJS worker.js. Dependencies are inlined into one file by default except for externals, and the output package.json declares type: commonjs. At runtime, the entry installs the bundle module map before starting the application. An ESM application can have a CJS deployment entry; the deployment tool determines artifact format.

Start with this ordinary deployment flow to verify application behavior before experimenting with snapshots. The framework uses Manifest for discovery; business code can still use fs. Templates, static assets, and custom dynamic paths must be delivered in the artifacts. [bundle-manifest.json](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bundler/docs/output-structure.md) records build results for inspection and debugging, while execution uses the module map installed in the entry:

```bash
egg-bin bundle
cd dist-bundle
node worker.js
```

Default resource scanning starts at app. app/public, app/assets, and app/static are always copied, including frontend JavaScript within them. Copied assets retain relative paths, and runtime baseDir points to the output directory, so resource reads relative to baseDir can continue working. For other directories, configure roots or forceCopyDirs under bundle.runtimeAssets in module.yml. Explicit lists replace their corresponding defaults:

```yaml
bundle:
  runtimeAssets:
    roots:
      - app
      - templates
    forceCopyDirs:
      - app/public
      - app/assets
      - app/static
```

Native addons, explicit externals, and some automatically detected peer, optional, or native dependencies must remain resolvable in deployment. Check dynamic require and paths assembled at runtime separately. Inspect the real artifacts and start them in a minimal deployment directory to establish which node_modules are still needed.

## Snapshots stop before runtime resources are initialized

A V8 startup snapshot saves process heap state. Egg's safe pause point is after configWillLoad. configDidLoad, didLoad, willReady, didReady, and serverDidReady execute later, after restoration. Create database connections, sockets, watchers, and background timers in an appropriate restored-runtime stage. The build then captures restorable startup state without carrying active development-machine connections into deployment.

This matters for Tegg. Its plugin creates ModuleHandler in configDidLoad and initializes the dependency graph and instances in didLoad. The snapshot does not yet contain a fully assembled DI instance heap. Bundle module preloading and early framework state are reused, while business object assembly continues through the restored lifecycle.

Framework resources that must exist before the cutoff need an explicit, symmetric release and restore implementation using snapshotWillSerialize and snapshotDidDeserialize. Serialization hooks run in reverse registration order and restoration hooks in forward order, supporting dependency teardown and reconstruction. Cleanup and recreation should be symmetric, and shutdown should handle the actual resources. Ordinary plugins and business code should create external connections in configDidLoad or later; snapshot hooks should not substitute for correcting early initialization.

Network built-ins, undici, and urllib are external and lazy by default to avoid creating non-serializable native bindings at build time. If another module initializes native state during import, locate the dependency and review force-external, egg.snapshot.lazyModules, and the relevant lifecycle boundary. Externalizing a module alone still requires checking that evaluation is actually deferred until restoration.

## Build single-process and cluster artifacts separately

Egg Bundler and snapshot capabilities are prerelease features. Verify plugin and dependency compatibility before deployment.

Egg's baseline is Node.js 22.18.0, but snapshot restoration requires Node.js 24 or later. Restoring a nontrivial Egg heap on Node 22 can cause a native fatal error, so the starter rejects it early. Use Node 24 or later for both build and restoration, and keep the build and deployment runtimes aligned.

A single-process [egg-bin snapshot build](../advanced/snapshot.md) creates dist-bundle/worker.js and snapshot.blob by default. Production restoration uses egg-scripts start --snapshot-blob; there is no snapshot start subcommand. The restored entry continues the lifecycle through didReady, then starts listening. This example uses port 7001:

```bash
egg-bin snapshot build
egg-scripts start \
  --snapshot-blob ./dist-bundle/snapshot.blob \
  --port 7001
```

Cluster builds create separate workers and blobs for app and agent, each with its own heap. These commands generate app_worker.js, agent_worker.js, and their snapshots, then start through the --bundle path. You can provide a blob for only one role and start the other from ordinary bundle JavaScript. Workers with blobs require process mode; ordinary cluster bundles without blobs also support worker_threads:

```bash
egg-bin snapshot build --cluster
egg-scripts start --bundle \
  --app-snapshot-blob ./dist-bundle/app.snapshot.blob \
  --agent-snapshot-blob ./dist-bundle/agent.snapshot.blob
```

Snapshot and cluster bundle startup do not support options.require; the starter rejects it before creating workers. If release scripts use that option for monitoring or bootstrap modules, review an alternative integration before a pilot deployment.

## Cold-start measurements from cnpmcore

The [cnpmcore 4.32.1 experiment](../advanced/snapshot.md) used Node.js 24.18.1, an Apple M1 Pro, and prod configuration. It compared ordinary bundle startup with snapshot restoration using the same generated JavaScript. Each mode had one warm-up, followed by ten interleaved measurements, reporting medians. This isolates the effect of restoration as far as possible from code and build differences.

The single-process median fell from 947 ms to 379 ms, a 60.0% reduction. For one agent and two app workers in process mode, the cluster median fell from 1356 ms to 591 ms, a 56.4% reduction. The timing boundaries differ: single-process measures from directly spawning Node until listening, while cluster measures from internal master orchestration until ready, excluding launcher and master bootstrap overhead. These figures cannot directly compare the complete startup costs of the two process models.

The results show that pre-executed startup work represents a substantial share for this application and hardware. The experiment measures cold starts of the same application with and without snapshots; its scope excludes framework-version upgrades and request throughput. Benefits differ when external service connections, remote configuration, or post-restoration assembly dominate startup. Keep code, environment, and timing boundaries consistent in your own experiment, and observe startup failures, memory, and the first real request too.

## Validate dependencies and fallback deployment

[Module-level side effects](../advanced/snapshot-troubleshooting.md) are easy to miss. Opening sockets, creating long-lived objects from environment data, registering background timers, or holding file and native handles can break builds or restoration. Check third-party packages as well. Leoric has targeted snapshot compatibility handling, but other ORMs and SDKs depend on their evaluation behavior and driver loading.

Web globals introduce another trap. fetch, Request, and Response may be stubbed during the build and reinstalled on restoration. Reading globalThis.fetch when a function executes can use the restored implementation. A module-level const f = fetch, or class X extends globalThis.Request, can instead capture a build-time binding in the blob. Change the binding time for such code; a name being present at runtime does not establish that the captured value is correct.

Validate in stages: ordinary startup, ordinary bundle, then snapshot. First check business routes, scheduled work, static assets, and shutdown in the bundle. Then verify snapshot build and restoration, followed by repeated cold starts in the real deployment environment. Record code version, Node version, external dependencies, and assets in the release, and retain ordinary bundle startup as a fallback.

Include external dependencies in rollback rehearsals. Copy the release directory into a production-equivalent environment, remove implicit development-workspace paths, and start both the ordinary bundle and snapshot. This checks that resources, dynamic dependencies, and configuration have all been delivered. For multi-process applications, verify agent communication, worker exits, and restarts too.

Extension authors should also test lifecycle differences between metadataOnly, ordinary startup, and snapshot restoration. Manifest generation skips normal boot hooks; snapshot builds run through configWillLoad; later initialization happens after restoration. Associate every resource's creation and release with explicit lifecycle stages to preserve behavior across these modes.
