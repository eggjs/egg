---
title: Tegg Vitest Adapter
type: package
summary: Custom Vitest runner for Egg request contexts and tegg module scopes, compatible with Vitest 4.1 and 5.
source_files:
  - tegg/core/vitest/package.json
  - tegg/core/vitest/src/runner.ts
  - tegg/core/vitest/src/index.ts
  - tegg/core/vitest/src/setup.ts
  - tegg/core/vitest/test/fixture_app.test.ts
  - plugins/mock/package.json
  - tools/egg-bin/src/commands/test.ts
  - https://vitest.dev/guide/migration/#removed-deprecated-entrypoints
updated_at: 2026-09-19
status: active
---

## Compatibility

`@eggjs/tegg-vitest` supports `vitest@^4.1.0 || ^5.0.0`. The runner extends
`TestRunner` from `vitest`; the old `vitest/runners` entry point was removed
in Vitest 5. `@eggjs/mock` also accepts Vitest 5 as its optional peer dependency.

Lifecycle overrides derive their argument tuples from the base runner and
forward all arguments. This accommodates the file list passed to
`onAfterRunFiles` and the retry options passed to `onBeforeTryTask` in Vitest 5.
The monorepo's default Vitest catalog remains on version 4.

## Context lifecycle

`egg-bin` automatically selects the adapter's `runner` and `setup` entry points.
`configureTeggRunner()` lets a test file choose its application and mock cleanup
behavior. During collection, the runner resolves that application and waits for
`app.ready()`.

The runner holds a module scope for each file and each test. Before each test
attempt, it creates a request context and enters it synchronously, before any
awaited cleanup. Otherwise, the caller's async continuation retains the previous
context on a retry. The previous attempt's scope is released before the new
scope starts. After the test, the runner releases the test scope and restores
the file's context.

The fixture application tests cover injected service identity and scope cleanup
across retries. Run the adapter suite from the repository root with
`vitest run --root tegg/core/vitest --config vitest.config.ts`.
