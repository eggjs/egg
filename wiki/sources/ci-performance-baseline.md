---
title: CI performance baseline, September 2026
type: source
summary: GitHub job timings show that main-suite execution and delayed runner starts dominate CI latency.
source_files:
  - .github/workflows/ci.yml
  - .github/workflows/e2e-test.yml
  - vitest.config.ts
  - scripts/ci-test-benchmark/vitest-summary.js
  - plugins/schedule/test/subscription.test.ts
  - tools/egg-bin/test/commands/debug.test.ts
  - tools/egg-bin/test/commands/dev.test.ts
  - https://github.com/eggjs/egg/actions/runs/35879900054
  - https://github.com/eggjs/egg/actions/runs/35861608073
  - https://github.com/eggjs/egg/actions/runs/35879899540
  - https://github.com/eggjs/egg/actions/runs/35861720800
updated_at: 2026-09-24
status: active
---

## Scope and measurement

Inspected ten completed, non-cancelled CI runs and three E2E runs from September
23 using `gh run view --json jobs,createdAt,updatedAt,conclusion,event,headSha`,
plus selected job logs. The local workflow inspected was at `0d0b36c88`; the
latest measured run was at `c92333429`.

Elapsed time below is workflow `updatedAt - createdAt`. Job execution time is
`completedAt - startedAt`. Start delay is job `startedAt - workflow.createdAt`.
For the independent test jobs, start delay approximates scheduling and runner
provisioning delay; it does not establish the exact cause of the wait. The `done`
job is excluded from the maximum start-delay calculation because it has dependencies.

This is a diagnostic sample across different commits, including a matrix
expansion and test changes. It is not a controlled before/after benchmark or a
long-term percentile baseline. Failed runs are retained to expose wasted work.

| CI run                                                               | Result  | Elapsed, minutes | Maximum independent-job start delay, minutes |
| -------------------------------------------------------------------- | ------- | ---------------: | -------------------------------------------: |
| [35849722187](https://github.com/eggjs/egg/actions/runs/35849722187) | success |            21.93 |                                         3.65 |
| [35850384973](https://github.com/eggjs/egg/actions/runs/35850384973) | success |            22.20 |                                         2.82 |
| [35858052982](https://github.com/eggjs/egg/actions/runs/35858052982) | success |            19.97 |                                         2.08 |
| [35858054582](https://github.com/eggjs/egg/actions/runs/35858054582) | success |            32.23 |                                        15.72 |
| [35861438070](https://github.com/eggjs/egg/actions/runs/35861438070) | success |            34.83 |                                        18.60 |
| [35861608073](https://github.com/eggjs/egg/actions/runs/35861608073) | success |            46.07 |                                        27.68 |
| [35861720590](https://github.com/eggjs/egg/actions/runs/35861720590) | failure |            47.08 |                                        30.15 |
| [35862054578](https://github.com/eggjs/egg/actions/runs/35862054578) | failure |            51.15 |                                        35.40 |
| [35875439635](https://github.com/eggjs/egg/actions/runs/35875439635) | failure |            32.25 |                                        12.97 |
| [35879900054](https://github.com/eggjs/egg/actions/runs/35879900054) | failure |            20.82 |                                         1.72 |

The sample median elapsed time is 32.24 minutes. Summed job execution time has a
median of 146.89 runner-minutes per CI run. These are unweighted execution
minutes, not billed minutes, and exclude E2E and CodeQL.

## Latest run: execution bottlenecks

These timings come from [run 35879900054](https://github.com/eggjs/egg/actions/runs/35879900054).

| Job                                                    | Start delay | Job execution | Main test step |
| ------------------------------------------------------ | ----------: | ------------: | -------------: |
| Linux / Node 22                                        |        40 s |         828 s |          747 s |
| Linux / Node 24, coverage                              |         4 s |         733 s |          671 s |
| Linux / Node 26                                        |         4 s |         437 s |          372 s |
| macOS / Node 22                                        |        93 s |        1154 s |         1033 s |
| macOS / Node 24                                        |        86 s |        1031 s |          901 s |
| macOS / Node 26                                        |       103 s |         850 s |          718 s |
| Windows / Node 22                                      |        69 s |        1120 s |          922 s |
| Windows / Node 24                                      |        86 s |        1024 s |          807 s |
| Windows / Node 26                                      |        56 s |         946 s |          714 s |
| Lint, typecheck, formatting, package build, site build |         4 s |         114 s |            n/a |

Across all 13 inspected runs, 191 successful `Install dependencies` steps took
1–16 seconds, with a median of 4 seconds. This excludes cache transfers and tool
setup. In the latest run, Windows MySQL setup took 95–102 seconds. Cache restore
and post-job steps also cost tens of seconds on some runners.

Inference: installation and the static-check job are secondary optimization
targets. Even removing them entirely would leave the main test jobs dominant.

The macOS / Node 24 job in the successful 46-minute run waited 1661 seconds
before starting and executed for 1096 seconds. The latest E2E run completed in
4.97 minutes; an earlier E2E run took 20.58 minutes although its longest job
executed for only 345 seconds. Runner demand must be measured alongside test speed.

## Test and failure evidence

The latest main suite reported 584 test files, including skipped files. Its
macOS / Node 22 Vitest summary was 1026.34 seconds, with tracked phases of
70% tests, 19% import, and 11% transform. Phase percentages aggregate tracked
work; they are not percentages of wall-clock time saved by removing a phase.

Examples of file durations in that run:

- `plugins/mock/test/cluster.test.ts`: 56.7 seconds on macOS / Node 22.
- `plugins/development/test/development-ts.test.ts`: 51.6 seconds on macOS / Node 22.
- `plugins/schedule/test/subscription.test.ts`: 38.5 seconds on macOS / Node 22.
- `packages/egg/test/lib/core/logger.test.ts`: 75.9 seconds on Windows / Node 22.
- `packages/cluster/test/app_worker.test.ts`: 93.5 seconds on Linux / Node 22.

`plugins/schedule/test/subscription.test.ts` contains fixed waits of 10 seconds
in CI, 3 seconds, and 5 seconds. Its interval fixture has a real 4-second
interval, so a replacement must still verify the intended scheduling behavior.

The latest Linux / Node 26 egg-bin job failed in
`test/commands/debug.test.ts`: inspector port `127.0.0.1:9229` was already in use.
Both that file and `test/commands/dev.test.ts` start `dev --inspect`.
Inference: concurrent use of the default inspector port is a candidate cause;
identify the port owner and verify cleanup before calling it the complete diagnosis.

The `done` job was skipped in that failed run. Its failure check currently uses
`always()` only on a step, while the job itself depends on failed jobs. A revised
conditional CI plan needs an explicit job-level final gate.

The existing JSON parallelism report excludes suite-level hooks and import time.
Use its concurrency estimates with the caveat in
[CI parallel test metrics](../workflows/ci-parallel-test-metrics.md).

## Refresh

Collect job timestamps and logs again after a workflow, Vitest, runner image, or
matrix change. Compare the same commit and test inventory when evaluating an
optimization. Keep failed, retried, cancelled, warm-cache, and cold-cache samples
separate in acceptance measurements.
