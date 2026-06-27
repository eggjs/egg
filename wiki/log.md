# Wiki Log

Dates use the workspace-local Asia/Shanghai calendar date.

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
