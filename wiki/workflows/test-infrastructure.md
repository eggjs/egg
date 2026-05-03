---
title: Test Infrastructure
type: workflow
summary: Local services and CI benchmark tooling used to reproduce and measure test behavior.
source_files:
  - README.md
  - benchmark/ci-test/README.md
  - package.json
  - scripts/dev-services.js
  - scripts/ci-test-benchmark.js
updated_at: 2026-05-04
status: active
---

# Test Infrastructure

Egg's repository-level test tooling includes helpers for local external services
and optional CI benchmark reports.

## Local External Services

`utoo run dev:services:start` starts the Docker Compose stack declared in
`dev-services.compose.yml`. It provides MySQL 8 and Redis 7 on the CI-aligned
default host ports:

- MySQL: `127.0.0.1:3306`
- Redis: `127.0.0.1:6379`

The helper creates the MySQL databases used by DAL, ORM, Redis, session, and
cnpmcore-related fixtures. `dev:services:status`, `dev:services:stop`, and
`dev:services:reset` wrap the corresponding lifecycle actions. Port and image
overrides exist for compatibility checks, but the full local test path still
expects the default host ports because several fixtures hard-code them.

## CI Test Benchmark

`ut run benchmark:ci-test` runs `scripts/ci-test-benchmark.js`, which executes a
Vitest command and writes:

- `report.md`
- `report.json`
- `vitest-results.json`

The default output directory is `benchmark/ci-test/<timestamp>`. The harness is
for explicit measurement runs only; it does not change required checks or CI
gate semantics. Use `--output-dir` when a deterministic artifact path is needed.
