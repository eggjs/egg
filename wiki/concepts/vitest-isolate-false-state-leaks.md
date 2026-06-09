---
title: Vitest isolate:false state leaks
type: concept
summary: Why the root vitest config (pool:threads + isolate:false) exposes cross-file/cross-project state leaks, the concrete leaks found, and how they were fixed.
source_files:
  - vitest.config.ts
  - packages/utils/src/import.ts
  - packages/utils/test/snapshot-import.test.ts
  - plugins/mock/src/app/extend/application.ts
  - plugins/mock/src/lib/mock_agent.ts
  - plugins/multipart/test/file-mode.test.ts
updated_at: 2026-06-08
status: active
---

## Context

The root `vitest.config.ts` runs the whole monorepo with `pool: 'threads'` and
`isolate: false`. Under this mode every test **file** in a worker shares one
Node realm: the module registry, `globalThis`, module-level `let` bindings, the
undici global dispatcher, `process` env/listeners and timers are all shared
across files (and across `projects`, since projects share the worker pool).

This is much faster, but any module that caches process- or realm-global state
without resetting it leaks that state into later files. Because vitest schedules
files across threads, _which_ test loses is order/timing dependent — so failures
are **nondeterministic** and move from run to run. That nondeterminism is the
signature of this class of bug, not flaky tests per se.

## How to reproduce / triage (CI-faithful)

- Use Node 22 or 24 (CI matrix). Node 26 introduces unrelated undici/deprecation
  failures that are NOT isolate bugs — do not diagnose on Node 26.
- Install with utoo (`ut install --from pnpm`), not a bare `pnpm install`. utoo
  hoists workspace packages (e.g. `egg`) to the root `node_modules`; tests like
  `cluster/options` and `mock/format_options` resolve the framework via
  `getFrameworkPath('egg')` from a fixture `baseDir` and only pass with that
  hoisting. A non-utoo install causes phantom "egg is not found" /
  "Cannot find module" failures that masquerade as isolate bugs.
- Clear `dist/` first (see AGENTS.md "Local CI" / duplicate-proto note).
- Triage rule: run a failing file **alone**. Passes alone but fails in the full
  run ⇒ genuine cross-file leak. Fails alone too ⇒ a real bug or an
  environmental dependency (MySQL/redis/DNS), not isolation.

## Root causes found

1. **Module-resolution poisoning via `@eggjs/utils` import.ts** (cross-project).
   `setSnapshotModuleLoader()` set a module-level `_snapshotModuleLoader` and
   flipped the module-level `isESM` to `false`, with no way to unset it.
   `snapshot-import.test.ts` had a no-op `afterEach`, so after it ran, every
   later file in the worker resolved modules in CJS + snapshot mode and failed
   with `Can not find plugin @eggjs/<x>` / `Cannot find module
'@eggjs/<x>/package.json'`. This single leak caused most of the cross-project
   failures (ajv-plugin, typebox-validate, view-nunjucks, standalone, …).
   **Fix:** `setSnapshotModuleLoader(undefined)` now clears the loader and
   restores the auto-detected `isESM`; the test clears it in `afterEach`.
   (`setBundleModuleLoader` and the tegg/core loader tests already reset their
   `globalThis.__EGG_BUNDLE_MODULE_LOADER__` in `afterEach`, so they were fine.)

2. **Wrong-app context reuse in `@eggjs/mock` `mockContext()`.**
   `mockContext()` reused `this.currentContext` without checking the context
   belongs to `this` app. With a shared/lingering async-local context (multiple
   `mm.app()` apps in one realm, or `isolate:false` carry-over), `app2.mockContext()`
   returned app1's context, binding helpers/services to the wrong app config.
   This produced e.g. `security/surl` "custom white protocol" → `''` (app2's
   helper read app1's whitelist) and `security/csrf` 401s.
   **Fix:** only reuse when `this.currentContext.app === this`.

3. **Potential undici global dispatcher carry-over in `@eggjs/mock`
   `mock_agent.ts`.** Dispatcher state is stored on `globalThis`
   (`__globalDispatcher`, `__mockAgent`) and `__globalDispatcher` is captured
   once and never cleared. Mitigated in practice by the global
   `afterEach(mock.restore)` in `setup_vitest.ts`; noted as a latent risk.

## Not isolate bugs (do not chase as such)

- `orm-plugin` (`Table 'test.apps' doesn't exist`) needs MySQL; `redis` needs a
  redis server; `security/ssrf` (`IllegalAddressError: illegal address`) needs
  DNS/network. These pass in CI where the services exist; they fail in a bare
  local run regardless of isolation.
- `multipart/file-mode` is **load-sensitive and flakes even with `isolate:true`**
  (fails ~1/4 when run alongside the other multipart files). Deep tracing showed
  the uploaded file is reported (200 + path) but `existsSync` is already false
  right after the save `pipeline()` resolves under load — a race in the multipart
  file-save path, not a state leak. It passes 100% as a single file. Treat as a
  pre-existing flaky test to fix in the multipart save path or test, separately
  from the isolate:false work.

## Result

Full Node-22 suite under `isolate:false`: 15 failing files → 3, of which 2 are
environmental (MySQL/DNS, green in CI) and 1 (`multipart/file-mode`) is a
pre-existing load flake independent of isolation.
