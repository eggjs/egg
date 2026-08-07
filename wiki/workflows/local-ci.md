---
title: Local CI
type: workflow
summary: Local validation should run tests from clean sources and avoid stale build artifacts before tegg tests.
source_files:
  - AGENTS.md
  - .github/workflows/ci.yml
  - package.json
  - tools/egg-bin/package.json
  - tools/egg-bin/tsconfig.json
  - tegg/core/loader/src/impl/ModuleLoader.ts
  - tegg/core/metadata/src/model/graph/GlobalGraph.ts
  - tegg/plugin/controller/test/fixtures/apps
updated_at: 2026-08-06
status: active
---

# Local CI

The repository's GitHub CI test job installs dependencies with
`ut install --from pnpm` and runs tests with `ut run ci` for the main test
matrix. It does not build packages before running tests.

## Exception: egg-bin tests need a built dist

The dedicated `test-egg-bin` CI job builds egg-bin in its own step
(`ut run build` with `working-directory: tools/egg-bin`) before
`ut run test --workspace @eggjs/bin`. When filtering with `--workspace`,
prefer the package-name form: the `./tools/egg-bin` path form does not match
on Windows, and a failed build surfaces later as dozens of
`command dev not found` test failures. The oclif CLI under test loads commands
from `tools/egg-bin/dist/commands` (`oclif.commands` in its package.json), and
oclif's tsconfig fallback cannot map that path back to `src/` (no
`rootDir`/`baseUrl` in the package tsconfig), so an unbuilt checkout fails every
coffee-forked test with `Error: command dev not found`.

Locally: build egg-bin before running its test suite, re-build after every
source change under `tools/egg-bin/src` (tests exercise the compiled output),
and remove `tools/egg-bin/dist` afterwards so the stale-dist rules below hold
for tegg runs.

Local validation should follow the same shape for unit tests: run tests from
clean source files, and build separately when validating generated output,
package exports, or packaging behavior.

## Stale Build Artifacts

If local tegg tests fail with `duplicate proto` after a previous build, stale
`dist/` directories are the first thing to check.

Inference: tegg module loading can scan both source and built files when
TypeScript is supported locally. Loading `src/*.ts` and `dist/*.js` for the same
decorated class creates duplicate metadata graph entries, which surfaces as a
`duplicate proto` error.

Use the cleanup command in `AGENTS.md` to remove stale `dist/` directories
outside `node_modules`, test directories, and fixtures before re-running tests.

## Stale fixture `.egg` caches

Each egg fixture app under `test/fixtures/apps/*` keeps a per-app
`.egg/compile-cache` directory. This cache holds a **scan manifest** of the
files the tegg loader picks up, not just compiled output.

Consequence: when you **add a new decorated source file** (a new
`@InnerObjectProto` / `@XxxLifecycleProto` / controller) to a plugin, a fixture
app whose `.egg` cache predates that file can keep scanning the old manifest, so
the new proto is **never scanned or instantiated for that app** — while other
apps whose caches happen to be fresh work fine. The failure is confusing and
partial (e.g. one app's routes 404 while another app's identical setup passes),
and it is easy to misread as a graph / instantiation bug rather than a cache
artifact. Symmetrically, a **deleted** source file still listed in a stale
manifest fails at load with `Cannot find module '.../Foo.ts'`.

Fix: clear the fixture caches before re-running, then run from clean sources:

```bash
find tegg -name .egg -type d -not -path '*/node_modules/*' -exec rm -rf {} +
```

Note (verified 2026-07-13): inner-object instantiation itself is NOT
reachability-gated — `InnerObjectLoadUnitBuilder#buildProtoGraph` topologically
sorts and returns **every** scanned inner-object proto (the graph is only used
for ordering, cycle detection, and missing-dependency errors). So "a scanned
inner object was not instantiated" points at the scan input (a stale `.egg`
manifest), not at graph pruning.
