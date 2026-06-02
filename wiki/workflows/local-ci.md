---
title: Local CI
type: workflow
summary: Local validation should run tests from clean sources and avoid stale build artifacts before tegg tests.
source_files:
  - AGENTS.md
  - .github/workflows/ci.yml
  - package.json
  - tegg/core/loader/src/impl/ModuleLoader.ts
  - tegg/core/metadata/src/model/graph/GlobalGraph.ts
updated_at: 2026-06-03
status: active
---

# Local CI

The repository's GitHub CI test job installs dependencies with
`ut install --from pnpm` and runs tests with `ut run ci` for the main test
matrix. It does not build packages before running tests.

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
