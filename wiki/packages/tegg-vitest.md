---
title: Tegg Vitest Adapter
type: package
summary: Vitest 5 runner for Egg request contexts and tegg module scopes.
source_files:
  - .github/workflows/ci.yml
  - pnpm-workspace.yaml
  - tegg/core/vitest/package.json
  - tegg/core/vitest/src/runner.ts
  - tegg/core/vitest/src/index.ts
  - tegg/core/vitest/src/setup.ts
  - tegg/core/vitest/test/fixture_app.test.ts
  - tegg/core/vitest/test/runner-multi-app.test.ts
  - plugins/mock/package.json
  - tools/egg-bin/src/commands/test.ts
  - tools/egg-bin/src/commands/cov.ts
  - tools/egg-bin/test/commands/test.test.ts
  - tools/egg-bin/test/commands/cov.test.ts
  - tools/create-egg/src/templates/simple-ts/package.json
  - tools/create-egg/src/templates/tegg/package.json
updated_at: 2026-09-23
status: active
---

## Compatibility

`@eggjs/tegg-vitest` requires `vitest@^5.0.1`. The runner extends `TestRunner`
from `vitest`. `@eggjs/mock` has the same range for its optional Vitest peer.
Vitest 4 is no longer supported.

Lifecycle overrides use Vitest 5 argument types and
forward all arguments, including the file list passed to `onAfterRunFiles`
and the retry options passed to `onBeforeTryTask`.
The monorepo catalog uses `^5.0.1` for Vitest, its V8 coverage provider, and its
UI. The TypeScript and tegg application templates also use Vitest `^5.0.1`.

The `test-tegg-vitest` CI job installs the catalog versions, typechecks the
adapter, and runs its tests with isolated workers and with one shared thread
worker (`--pool threads --no-isolate --maxWorkers 1`).

`egg-bin` uses the Vitest 5 `startVitest` API with `config: false` to prevent
parent config discovery. Coverage exclusions are relative to the application
root; absolute user patterns are converted to relative patterns before Vitest
matches them. `TEST_REPORTER=json` uses Vitest 5's default output file,
`.vitest/json/output.json` under the application root.

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
across retries. The concurrent-app regression drives the runner hooks for two
apps that share a service class. It checks separate request contexts and service
instances, retry argument forwarding, and independent scope cleanup.
Run the adapter suite from the repository root with
`vitest run --root tegg/core/vitest --config vitest.config.ts`.
