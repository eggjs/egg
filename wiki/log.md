# Wiki Log

Dates use the workspace-local Asia/Shanghai calendar date.

## [2026-06-28] decision | secure release pipeline design + P0 hardening

- sources touched: `.github/workflows/release.yml`, `scripts/version.js`, `scripts/publish.js`, `scripts/utils.js`, `scripts/sync-cnpm.js`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/decisions/secure-release-pipeline.md`
- note: Recorded the target secure-release design from a multi-agent design pass (3 architectures red-teamed → synthesized). Maintainer chose a GitHub-Release-triggered model: `release-prepare.yml` (dispatch) bumps + signs + drafts a Release; publishing the Release triggers `release.yml` (`on: release`, read from default branch `next`) → guard → zero-secret build → Environment-gated OIDC publish → finalize. Verified GitHub facts: release events read the workflow from the default branch with `GITHUB_SHA`=tag commit; `choice` inputs aren't API-enforced; egg default branch is `next`. P0 (code/workflow hardening: argv git ops, npm-name validation, prerelease→latest guard, isPublished 404-handling, notice loglevel, branch choice+guard) landed in #6017; `--ignore-scripts` deferred to P1 because `@eggjs/egg-bundler` has a `prepublishOnly` build.

## [2026-06-28] workflow | record egg-bin Windows shell probe hotspot

- sources touched: `tools/egg-bin/bin/run.js`, `tools/egg-bin/test/fixtures/my-egg-bin/bin/run.js`, PR #6014 CI logs
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/workflows/egg-bin-windows-shell-probe.md`
- note: Recorded the PR #6014 investigation that found hosted-Windows `test-egg-bin` slowness was oclif's synchronous shell probe when spawned children lacked `SHELL`. The final code keeps only the Windows `SHELL` preset before dynamically importing `@oclif/core`; temporary timing and runner-diagnostic code was removed from the PR. Latest single Windows bin job passed in about 3m06s with `test/commands/test.test.ts` around 48.8s and `test/my-egg-bin.test.ts` around 8.5s.

## [2026-06-28] package | snapshot bundler lazy-externalizes undici + urllib by default (PR #6011)

- sources touched: `tools/egg-bundler/src/lib/prelude.ts`, `tools/egg-bundler/test/snapshot-lazy-external.test.ts`, `tools/egg-bundler/test/snapshot-lazy.realbuild.test.ts`
- pages updated: `wiki/packages/egg-bundler.md`, `wiki/log.md`
- branch: `feat/snapshot-default-lazy-undici-urllib` (off `next`)
- change: Added `undici` + `urllib` to `DEFAULT_SNAPSHOT_LAZY_MODULES` so an app gets a serializable V8 snapshot without listing them in `egg.snapshot.lazyModules`. Egg builds its HttpClient (urllib → undici) during boot, and undici's llhttp `WebAssembly` + `HTTPParser` cannot be snapshot-serialized. As npm packages they would be inlined; listing them forces them external (`Bundler` adds lazy ids to the externals map) so the prelude member-proxy stub is used at build and the real module is required on restore.
- history note: the PR originally (off the older `next`) shipped a bespoke per-export forwarder in `__makeLazyExt` to make `class HttpClient extends urllib.HttpClient` survive the build→restore boundary. While the PR was open, #6003 landed on `next` and rewrote `__makeLazyExt` into a general **access-path-recording member-proxy** (`makeMember`) that already handles `class X extends pkg.Klass` / `DataTypes.INTEGER(11).UNSIGNED` plus `ownKeys`/`getOwnPropertyDescriptor` via `__EXTERNAL_EXPORTS`. The PR was rebased onto that and **reduced to just the default-list addition** (forwarder dropped as superseded). Note `makeMember`'s `protoProxy` has only a `get` trap (no `getPrototypeOf`), so `instanceof RealBase` on a snapshot-frozen subclass is `false` — methods/fields/super() work, identity-by-prototype does not.
- verification: unit test asserts undici+urllib in the default list; new real `@utoo/pack` build test exercises a **forced-external npm package** `class Sub extends pkg.Base` across the build-stub / restore-real boundary in one process (upstream only realbuild-tested the `node:http` builtin). 28 lazy/realbuild tests green; tsgo + oxlint clean. Pre-existing macOS `ManifestLoader`/`EntryGenerator` tmpdir-symlink failures unrelated.

## [2026-06-27] concept | fix concurrent-import race in multi-app boot (oxc-node PR #5965)

- sources touched: `packages/utils/src/import.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- note: `tegg/plugin/tegg/test/MultiAppParallel.test.ts` ("…under concurrent boot") flaked ~12% (tsx) / ~24% (oxc-node) on macOS CI with `Can not find plugin watcher` or `Cannot convert undefined or null to object`. NOT caused by the tsx→oxc-node switch (both transpilers flake). Root cause: under `describe.concurrent`, multiple app loaders call `importModule()` on the same `.ts` module simultaneously; the transpile loaders recompile per-`import()` (tsx appends `?<ts>`, defeating Node's dedup) so a concurrent first-load can return a namespace whose `default` is `undefined` → empty framework `config/plugin` (watcher loses its `path`) or `Object.getOwnPropertyNames(undefined)` in `loadExtend`. Fix: `importModule` shares one in-flight `import()` per URL. 40/40 green under both transpilers after; full suite stays 527 files / 3430 tests, 0 failures. Heisenbug (instrumentation masks it); the `.egg/manifest.json` read/write race was a red herring. Recorded as root cause #5 on the concept page.

## [2026-06-27] workflow | CI surfaces single-run parallelism metrics for the isolate:false suite

- sources touched: `vitest.config.ts`, `.github/workflows/ci.yml`, `scripts/ci-test-benchmark/{index,vitest-summary,report,cli,fs,environment}.js`, `benchmark/ci-test/README.md`, `.gitignore`, `packages/supertest/test/supertest.test.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/workflows/ci-parallel-test-metrics.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- branch: `feat/ci-parallel-metrics` (off `feat/tegg-multiapp-isolation`)
- note: The full suite already runs `pool:threads` + `isolate:false` (full parallelism, made safe by tegg `TeggScope`). This change instruments the existing **test gating job** to show _how parallel it actually ran_, without touching gate semantics. `vitest.config.ts` adds a `json` reporter **only when `CI` is set** (writes `benchmark/ci-test/ci-run/vitest-results.json` as a side effect of the gating `ut run ci`; default console reporter preserved). A new `Report parallelism metrics` step (`if: always()`) runs the existing `ci-test-benchmark` harness in a new `--report-only --vitest-json <path>` mode, which now computes **avg/peak concurrency, parallel efficiency, and critical path** via a concurrency-timeline sweep over per-file `startTime`/`endTime`, and appends the report to `$GITHUB_STEP_SUMMARY`. Key gotcha found and fixed: the step calls `node scripts/ci-test-benchmark.js` **directly**, because `ut run <script> -- …` re-serializes forwarded args into a `sh -c` string without re-quoting, so parentheses in `--name` throw `syntax error near unexpected token '('`. Honesty caveat baked into the report footnote (corrected after adversarial review): Vitest 4 derives a file's interval from test-level timings, so spans cover test bodies + per-test beforeEach/afterEach but **exclude suite-level beforeAll/afterAll (egg app boots) and module transform/import** — avg/efficiency are lower bounds; peak concurrency is the robust signal. Worker ceiling mirrors the config (Windows caps at 2). Fully-skipped files are dropped from the timeline.

Full **isolate:false suite validated GREEN** under CI-faithful parallelism (`--maxWorkers 4`, services up): **526 files / 3425 tests pass, 0 failures**. The only two failures seen during validation were non-isolation: (1) `@eggjs/supertest` "should handle connection error" asserted exact `ECONNREFUSED` on hardcoded `127.0.0.1:1234`, which collides with a local proxy (Surge) → hardened to accept the connection-error family (`ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up`); (2) the pre-existing `@eggjs/multipart` upload load-flake (fails under isolate:true too) surfaces only when a 12-core box over-saturates beyond CI's 4 vCPUs — out of scope, mitigated by CI-faithful worker count. Validated end-to-end: edited config loads in real vitest (both reporters, JSON at the configured path), harness math cross-checked independently, `--report-only` exits 0 on missing JSON, step-summary append is cross-platform, oxfmt/oxlint clean.

## [2026-06-22] package | egg-bundler CJS/ESM require interop fixed upstream in @utoo/pack (EGG-69)

- sources touched: `pnpm-workspace.yaml`, `tools/egg-bundler/src/lib/Bundler.ts`, `tools/egg-bundler/test/Bundler.test.ts`, `tools/egg-bundler/test/cjsEsmInterop.realbuild.test.ts`
- note: Bundled cnpmcore crashed at runtime with `<path>/tsconfig.json is malformed JSON5.parse is not a function`. Root cause: older `@utoo/pack` (Turbopack, target node) resolved a CJS `require('json5')` to json5's ESM `module` entry (`dist/index.mjs`, default-only), so `commonJsRequire` returned the `{ __esModule, default }` namespace and `JSON5.parse` was undefined. This is now **fixed upstream** (utooland/utoo#3185): `@utoo/pack` >= 1.4.16 resolves a CJS `require()` of such a dual package to its CommonJS `main`, matching Node's own CommonJS resolution. The earlier in-repo workaround (a post-build patch of `_turbopack__runtime.js` that unwrapped the lone `default`) is **removed** in favour of the upstream fix; the catalog `@utoo/pack` range is bumped to `^1.4.16`. Verified by a real `@utoo/pack` build over a json5-shaped dual fixture (`main`+`module`, ESM exports only `default`) required from authored CJS via a named member: the bundled worker runs the CJS implementation (`cjs:ok`) with no crash, confirming `require('pkg').member` resolves like Node. NB: the internal registry (`registry.antgroup-inc.cn`) still tops out at 1.4.14 (which lacks the fix); the OSS repo/CI uses the public registry where 1.4.16 is available.

## [2026-06-20] concept | fix Windows-flaky session test (teardown close/load race)

- sources touched: `packages/core/src/lifecycle.ts`, `packages/egg/src/lib/egg.ts`, `packages/core/test/lifecycle.test.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- note: Windows CI flakily failed `@eggjs/session` `session.test.ts` with "app has been closed" / "Can't find viewEngine". Root cause: a still-loading `mm.app()` app/agent (load runs on `process.nextTick` as a `registerBeforeStart` hook) calls `Lifecycle.registerBeforeClose()` after `close()` already set `#isClosed`, directly in `egg.ts` `load()` or lazily via `coreLogger`→`createLoggers()` from `dumpTiming` / `_unhandledRejectionHandler`. The `assert(#isClosed === false)` threw, becoming a process unhandled rejection that `isolate:false` attributes to whatever file is running. Fix: `registerBeforeClose()` now skips (no-op + debug) when already closed instead of throwing; `load()` short-circuits when `lifecycle.isClosed` (removes the just-added unhandledRejection listener, returns); added `Lifecycle.isClosed` getter + regression test. Continuation of the isolate:false work (root cause #4 on the concept page).

## [2026-06-08] concept | vitest isolate:false state leaks diagnosed and fixed

- sources touched: `packages/utils/src/import.ts`, `packages/utils/test/snapshot-import.test.ts`, `plugins/mock/src/app/extend/application.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/vitest-isolate-false-state-leaks.md`
- note: Under root `pool:threads` + `isolate:false`, two realm-global leaks caused nondeterministic cross-file/cross-project failures. (1) `setSnapshotModuleLoader` left module-level `_snapshotModuleLoader`/`isESM=false` set (no-op test teardown), poisoning module resolution for later files (`Can not find plugin …`). (2) `mockContext()` reused `currentContext` from a different app, binding helpers to the wrong app config (surl/csrf failures). Fixed both at the source. Full Node-22 suite: 15 → 3 failing files (remaining 2 environmental MySQL/DNS; `multipart/file-mode` is a pre-existing load flake that also fails under `isolate:true`). Reproduce on Node 22/24 with a utoo install — not Node 26 / bare pnpm.

## [2026-06-03] workflow | document local CI artifact cleanup

- sources touched: `AGENTS.md`, `.github/workflows/ci.yml`, `package.json`, `tegg/core/loader/src/impl/ModuleLoader.ts`, `tegg/core/metadata/src/model/graph/GlobalGraph.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/workflows/local-ci.md`
- note: Recorded that local unit tests should run from clean sources, because stale built `dist/` files can be scanned alongside tegg TypeScript sources and trigger `duplicate proto` failures.

## [2026-05-10] package | extract shared LoaderFS package

- sources touched: `packages/loader-fs/src/index.ts`, `packages/loader-fs/package.json`, `packages/core/src/index.ts`, `packages/core/src/loader/file_loader.ts`, `packages/core/src/loader/egg_loader.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/core.md`, `wiki/packages/loader-fs.md`
- note: Moved the loader-facing `LoaderFS` / `RealLoaderFS` boundary into `@eggjs/loader-fs` while keeping `@eggjs/core` as a consumer and re-exporter.

## [2026-05-07] package | document core LoaderFS boundary

- sources touched: `packages/core/src/index.ts`, `packages/core/src/loader/loader_fs.ts`, `packages/core/src/loader/file_loader.ts`, `packages/core/src/loader/context_loader.ts`, `packages/core/src/loader/egg_loader.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/core.md`
- note: Recorded `LoaderFS` as the minimal loader filesystem boundary and `RealLoaderFS` as the default implementation for existing non-bundled behavior.

## [2026-05-06] package | sync bundled runtime support changes

- sources touched: `tools/egg-bundler/src/lib/ExternalsResolver.ts`, `packages/utils/src/import.ts`, `plugins/onerror/src/lib/onerror.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`, `wiki/packages/utils.md`, `wiki/packages/onerror.md`
- note: Recorded native optional platform package externalization, the opaque native dynamic import fallback used by bundled `importModule()`, and the local `@eggjs/onerror` implementation that avoids `koa-onerror` template reads.

## [2026-05-03] package | record egg bundler runtime path mapping

- sources touched: `tools/egg-bundler/src/lib/EntryGenerator.ts`, `tools/egg-bundler/docs/output-structure.md`
- pages updated: `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Documented that generated workers keep runtime outputDir separate from original app paths and key bundle module lookup by relKey, output absolute path, precomputed original app absolute path, and manifest resolveCache aliases.

## [2026-05-03] package | refine egg bundler docs

- sources touched: `tools/egg-bundler/src/lib/ManifestLoader.ts`, `tools/egg-bundler/src/lib/ExternalsResolver.ts`, `packages/core/src/lifecycle.ts`, `packages/egg/src/lib/start.ts`
- pages updated: `tools/egg-bundler/README.md`, `tools/egg-bundler/docs/output-structure.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Documented manifest auto-generation in metadataOnly mode and clarified root dependency external detection plus the `externals.inline` override.

## [2026-05-02] package | document egg bundler tooling

- sources touched: `tools/egg-bundler/src/index.ts`, `tools/egg-bundler/src/lib/Bundler.ts`, `tools/egg-bin/src/commands/bundle.ts`, `tools/egg-bundler/docs/output-structure.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Recorded the new `@eggjs/egg-bundler` package and its `egg-bin bundle` CLI surface after the bundler stack reached `next`.

## [2026-04-21] bootstrap | seed wiki schema and starter pages

- sources touched: `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/repository-map.md`, `wiki/workflows/docs-and-api-updates.md`
- note: Replaced handbook-style schema with an LLM wiki schema and added minimal wiki scaffolding.

## [2026-04-22] refactor | make AGENTS canonical shared instructions

- sources touched: `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/log.md`
- note: Moved shared coding-agent and wiki guidance into AGENTS.md, and reduced CLAUDE.md to a thin wrapper that imports it.

## [2026-04-26] package | add shared typings package notes

- sources touched: `packages/typings/package.json`, `packages/typings/src/index.ts`, `packages/typings/src/global.ts`, `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/typings.md`
- note: Recorded `@eggjs/typings` as the shared home for cross-package global typing contracts.

## [2026-06-27] api | formalize bundle/snapshot module-loader hooks

- sources touched: `packages/utils/src/import.ts`, `packages/utils/README.md`, `packages/utils/test/module-importer.test.ts`, `packages/utils/test/fixtures/module-importer-require-esm/run.mjs`, `packages/typings/src/index.ts`
- pages updated: `wiki/log.md`, `wiki/packages/utils.md`
- note: Documented the `__EGG_BUNDLE_MODULE_LOADER__` → snapshot loader (`setSnapshotModuleLoader`) → `__EGG_MODULE_IMPORTER__` → native priority as a formal contract (JSDoc on `BundleModuleLoader`/`ModuleImporter` + README). Added regression coverage for the V8 snapshot-restore path where `__EGG_MODULE_IMPORTER__ = require` loads ESM with no dynamic-import callback (inline sync-require test + spawned `node:vm` fixture). No load-semantics change — types/declarations already existed.

## [2026-07-04] architecture | tegg module plugin mechanism (both hosts)

- sources touched: `tegg/core/{types,core-decorator,loader,metadata,runtime}`, `tegg/core/aop-runtime`, `tegg/plugin/{tegg,aop,dal}`, `tegg/standalone/standalone`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Ported tegg#325's declarative module plugin core to next and completed it: @InnerObjectProto/@EggLifecycleProto five variants, host-agnostic InnerObjectLoadUnit instantiated before the business graph builds (restores the two-phase ordering so declarative graph build hooks land in-window), egg-host wiring (#325 left app mode out), and conversion of the built-in AOP/DAL/ConfigSource hooks to module plugins on both hosts. Runner renamed to StandaloneApp (no alias). Also fixed plugin/controller's middlewareGraphHook silent no-op (registered on a not-yet-created graph) on branch fix/controller-middleware-graph-hook.

## [2026-07-09] docs | correct tegg module plugin feeding rules

- sources touched: `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/plugin/{aop,config,dal}/src/app.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Corrected stale feeding-rule notes: inner object/lifecycle classes now arrive only through `ModuleDescriptor.innerObjectClazzList`; built-in AOP/DAL/ConfigSource hooks are discovered as normal module plugin classes rather than hard-fed lists, and duplicate inner-object proto ids are errors instead of class-level dedupe.

## [2026-07-09] docs | align tegg module plugin notes with review fixes

- sources touched: `tegg/plugin/aop/src/lib/AopContextHook.ts`, `tegg/core/aop-runtime/src/AopContextAdviceRegistry.ts`, `tegg/core/aop-runtime/src/LoadUnitAopHook.ts`, `tegg/plugin/dal/src/index.ts`, `tegg/plugin/dal/src/lib/DalModuleLoadUnitHook.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Replaced stale DAL source paths and updated the AOP note after `AopContextHook` moved to lifecycle-proto/inner-object registration backed by `AopContextAdviceRegistry`.

## [2026-07-12] architecture | harden module plugin discovery and lifecycle contracts

- sources touched: `tegg/plugin/config/src/app.ts`, `tegg/plugin/config/src/lib/ModuleScanner.ts`, `tegg/core/runtime/src/impl/InnerObjectLoadUnitInstance.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/core/metadata/src/model/graph/GlobalGraph.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Recorded plugin-aware module discovery, strict per-root versus nearest-framework reference dedupe, explicit GlobalGraph build state, reverse actual-creation teardown for inner objects, the shared inner-unit PRIVATE boundary, qualifier rules, and standalone migration details.

## [2026-07-13] architecture | make tegg startup failure cleanup atomic

- sources touched: `tegg/core/metadata/src/factory/LoadUnitFactory.ts`, `tegg/core/lifecycle/src/LifycycleUtil.ts`, `tegg/core/runtime/src/factory/{LoadUnitInstanceFactory,EggObjectFactory}.ts`, `tegg/core/runtime/src/impl/{EggObjectImpl,EggInnerObjectImpl,ModuleLoadUnitInstance}.ts`, `tegg/plugin/tegg/src/lib/AppLoadUnitInstance.ts`, `tegg/standalone/standalone/src/{EggModuleLoader,StandaloneApp}.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Made load-unit and instance creation single-flight and atomic on failure, restricted provisional instance lookup to the active DI chain, added failed-init rollback for standard business/inner EggObjects, made object/lifecycle teardown await and aggregate every cleanup, removed host-side partial-instance recovery, made standalone business-unit loading transactional, and defined StandaloneApp as single-use with terminal cleanup and re-entrant init-chain destroy rejection.

## [2026-07-13] decision | keep module-plugin lifecycle failures fail-fast

- sources touched: `tegg/core/metadata/src/factory/LoadUnitFactory.ts`, `tegg/core/runtime/src/factory/LoadUnitInstanceFactory.ts`, `tegg/core/runtime/src/impl/{EggObjectImpl,EggInnerObjectImpl,InnerObjectLoadUnitInstance}.ts`, `tegg/core/runtime/src/model/AbstractEggContext.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/{EggModuleLoader,StandaloneApp}.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Reverted the broad single-flight, failed-init rollback, and multi-phase error aggregation hardening because it was not required by module-plugin startup. Kept the core inner-object behavior: decorator-only self lifecycle dispatch, lifecycle registration, and reverse actual-creation teardown.

## [2026-07-13] decision | keep StandaloneApp lifecycle linear

- sources touched: `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/test/index.test.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Removed shared init/destroy promises, AsyncLocalStorage re-entry detection, concurrent lifecycle coordination, and partial-resource wrappers from StandaloneApp. Kept a linear single-use lifecycle, fail-fast teardown, scope release, and the required business-before-inner destroy order.

## [2026-07-13] architecture | give host logger a dedicated inner-unit input

- sources touched: `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/README.md`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Separated the host logger from generic `innerObjects` input. Standalone accepts logger only through its dedicated logger option and rejects `innerObjectHandlers.logger`; the builder still represents that value as an injectable provided proto internally.

## [2026-07-13] api | keep StandaloneApp runtime state private

- sources touched: `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/test/index.test.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Removed test-only getters for module references, module configs, load units, and load-unit instances. Tests now verify manifest, config, and teardown behavior through the public lifecycle; `scopeBag` remains available for owning-scope object resolution.

## [2026-07-13] behavior | reserve StandaloneApp framework inner objects

- sources touched: `tegg/standalone/standalone/src/StandaloneApp.ts`, `tegg/standalone/standalone/test/index.test.ts`, `tegg/standalone/standalone/README.md`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Framework-owned `moduleConfigs`, `moduleConfig`, and `runtimeConfig` now take precedence over host input. Same-name host entries are silently ignored.

## [2026-07-13] refactor | keep logger specialization at the standalone API boundary

- sources touched: `tegg/core/runtime/src/impl/InnerObjectLoadUnitBuilder.ts`, `tegg/plugin/tegg/src/lib/ModuleHandler.ts`, `tegg/standalone/standalone/src/StandaloneApp.ts`
- pages updated: `wiki/log.md`, `wiki/concepts/tegg-module-plugin.md`
- note: Kept logger as a dedicated Standalone public option, but removed the logger-specific builder channel. Each host now adds its logger to the complete provided-inner-object map before invoking the host-agnostic builder.
