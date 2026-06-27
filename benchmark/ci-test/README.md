# CI Test Benchmark

`ut run benchmark:ci-test` runs the reusable CI test benchmark harness and writes a Markdown report, a JSON summary, and the raw Vitest JSON reporter output.

## Environment Setup

- Use Node.js `>=22.18.0`.
- Make sure the Utoo CLI is available as `ut`. The CI workflow uses `utooland/setup-utoo` before dependency installation.
- Install workspace dependencies from the repository root with `ut install --from pnpm`, matching the CI workflow.
- Run commands from the repository root so workspace paths and `vitest.config.ts` defaults can be detected.
- Keep Redis and MySQL available when benchmarking suites that require them. The CI test job uses Redis 7 on the default Redis port and MySQL 8 with a `test` database; the benchmark harness mirrors the CI Vitest flags but does not start external services.
- For CI-like metadata, set the relevant environment variables before running the command, for example `CI=1`, `GITHUB_SHA`, `RUNNER_OS`, or worker-related `VITEST_*` variables.

## Usage

```sh
# Run the suite and benchmark it
ut run benchmark:ci-test
ut run benchmark:ci-test -- --coverage
ut run benchmark:ci-test -- --output-dir .tmp/ci-benchmark -- ut execute vitest run packages/extend2/test/index.test.ts

# Summarize an existing Vitest JSON without running tests (the CI path)
ut run benchmark:ci-test -- --report-only --vitest-json benchmark/ci-test/ci-run/vitest-results.json
```

The default output directory is `benchmark/ci-test/<timestamp>`. Use `--output-dir` for a deterministic path when collecting artifacts.

## Parallelism metrics

Tests run with `isolate: false` (full parallelism; the tegg `TeggScope` per-app isolation keeps concurrent multi-app boots safe). The report reconstructs the concurrency timeline from each file's Vitest interval (`min test start .. max test end`) and reports:

- **Execution window** — `max(end) - min(start)`, the wall-clock span of test execution.
- **Busy time** — sum of per-file spans (the area under the concurrency curve).
- **Avg concurrency** — `busy time ÷ execution window`, the time-weighted mean number of files running at once.
- **Peak concurrency** — the maximum number of files whose intervals overlap (sweep line). The robust headline signal.
- **Parallel efficiency** — `avg concurrency ÷ worker ceiling` (the ceiling mirrors `vitest.config.ts`: Windows CI caps workers, otherwise the machine's available parallelism).
- **Critical path** — the longest single-file span (the wall-clock floor with unlimited workers).

> **Interval caveat:** the Vitest 4 JSON reporter derives a file's `startTime`/`endTime` from test-level timings only, so the span covers test bodies and per-test `beforeEach`/`afterEach` but **excludes suite-level `beforeAll`/`afterAll` (where egg boots its apps — often the dominant per-file cost) and module transform/import**. That excluded time still occupies the worker threads, so **avg concurrency and parallel efficiency are lower bounds** on real worker utilization; for `beforeAll`-heavy suites avg can read below 1 while peak is high. Use **peak concurrency** as the primary signal. Fully-skipped files (no test timings) are dropped from the calculation.

## CI integration

The `test` gating job in `.github/workflows/ci.yml` is instrumented without changing gate semantics:

1. `vitest.config.ts` adds a `json` reporter when `CI` is set, writing `benchmark/ci-test/ci-run/vitest-results.json` during the gating `ut run ci` run.
2. A `Report parallelism metrics` step (`if: always()`) runs the harness in `--report-only` mode against that JSON.
3. When `GITHUB_STEP_SUMMARY` is set, the Markdown report (including the parallelism table) is appended to the GitHub Actions job summary, so the metrics are visible on the run page per OS/Node matrix entry.

Gating still comes entirely from `ut run ci`; the metrics step is informational and exits `0` even when the JSON is missing.

## Outputs

- `report.md`: human-readable benchmark report (run, environment, parameters, parallelism, long-tail tables).
- `report.json`: structured report containing environment, command, wall time, Vitest summary, parallelism metrics, long-tail file/project durations, and coverage/worker/isolate parameters.
- `vitest-results.json`: raw Vitest JSON reporter output.
