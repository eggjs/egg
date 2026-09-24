---
title: GitHub Actions performance plan
type: workflow
summary: Proposed rollout to reduce test runtime and runner demand while retaining full compatibility checks before merge.
source_files:
  - .github/workflows/ci.yml
  - .github/workflows/e2e-test.yml
  - .github/workflows/cleanup-cache.yml
  - package.json
  - .gitignore
  - vitest.config.ts
  - packages/logger/vitest.config.ts
  - tools/egg-bin/vitest.config.ts
  - tools/egg-bin/test/commands/debug.test.ts
  - tools/egg-bin/test/commands/dev.test.ts
  - plugins/schedule/test/subscription.test.ts
  - tegg/plugin/orm/test/fixtures/prepare.js
  - scripts/ci-test-benchmark/environment.js
  - scripts/ci-test-benchmark/vitest-summary.js
  - codecov.yml
  - https://github.com/eggjs/egg/actions/runs/35879900054
  - https://github.com/eggjs/egg/actions/runs/35861608073
  - https://vitest.dev/guide/improving-performance
  - https://docs.github.com/en/actions/reference/limits
  - https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
  - https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs
updated_at: 2026-09-24
status: active
---

## Recommendation and scope

Implementation is in progress on `codex/ci-performance`. The workflow now uses
this PR/full matrix, merges verified coverage shards, uploads timing artifacts,
and requires all planned checks in `done`. Documentation-only PRs keep static
checks. The `ci:full` label selects the full profile on the next PR run; manual
runs and merge groups always use the full profile.

Schedule readiness checks now poll the asserted conditions. Inspector tests use
an OS-assigned port, and CLI option matching distinguishes `--inspect-port` from
`--inspect`. Hosted-run measurements are pending.

A resolved-configuration inspection found that Vitest 5 file-based projects do
not inherit root `pool`, `isolate`, or `fsModuleCache` settings. The new reporter
records actual project settings and worker ceilings. A shared-worker change
requires its own state-isolation validation.

Prioritize reliable test execution, fewer repeated platform combinations on PR
updates, and two-way sharding of the remaining long jobs. Keep the full Node.js
22/24/26 × Linux/macOS/Windows matrix on merge groups and `next` pushes.

The [measured baseline](../sources/ci-performance-baseline.md) separates the two
problems: execution takes roughly 20 minutes on the critical jobs, and independent
job starts can be delayed by more than 30 minutes. The latest static-check job
took 114 seconds; dependency installation had a 4-second sample median.

Inference: a reasonable initial target for ordinary code PRs is 8–12 minutes of
execution after runners become available. This is an engineering target, not a
measured speedup. End-to-end latency also depends on available runner capacity.
Full compatibility checks before merge remain a separate, longer stage until
test improvements or measured capacity changes shorten it.

## 1. Establish measurements and reliable gates

Extend the current benchmark reporting instead of adding a second test run:

- Upload the existing JSON and Markdown reports with OS, exact Node version,
  job purpose, shard, and run attempt in their artifact names. Use short retention.
- Record job start delay, setup, tests, coverage, cache transfers, and total
  runner-minutes separately. Report PR feedback latency and merge-group latency
  separately. Inspect organization concurrency and macOS availability before
  choosing shard counts; the observed delay alone does not prove a quota limit.
- Add file lifecycle/import/hook timing and retry counts. The current JSON
  intervals omit `beforeAll`/`afterAll` and imports. Record the effective worker
  count rather than relying on the benchmark helper's config-text estimate when
  worker overrides are introduced.
- Fix the inspector-port collision candidate in egg-bin. Prefer an OS-assigned
  port if the CLI and child propagation support it; otherwise isolate the
  conflicting tests. Verify child termination and the existing debug assertions.
- Make `done` execute with job-level `if: always()`. Fail for a failed or
  cancelled prerequisite, a failed planner, missing required coverage, or an
  unexpectedly skipped required job. Only accept skips explicitly selected by
  a successful plan. Preserve the required-check name and verify branch rules.

GitHub documents concurrency limits by plan and runner type. Check the actual
organization allocation before adding parallel jobs; `max-parallel` within one
matrix does not reserve organization-wide capacity.
See [Actions limits](https://docs.github.com/en/actions/reference/limits).

## 2. Separate PR feedback from full compatibility

Introduce a small planning job that emits the test matrix and expected jobs.
Keep every eligible test file in each selected OS/Node combination. Do not use
import-graph-based affected testing in the first rollout: Egg loads plugins,
fixtures, and configuration dynamically.

| Main-suite combination        | Ordinary code PR, proposed shards | Full compatibility profile, initial shards |
| ----------------------------- | --------------------------------: | -----------------------------------------: |
| Linux / Node 22               |                                 2 |                                          1 |
| Linux / Node 24 with coverage |                                 2 |                                          1 |
| Linux / Node 26               |                                 1 |                                          1 |
| macOS / Node 24               |                                 2 |                                          1 |
| Windows / Node 24             |                                 2 |                                          1 |
| macOS / Node 22 and 26        |             defer to full profile |                                     1 each |
| Windows / Node 22 and 26      |             defer to full profile |                                     1 each |

The ordinary PR profile executes five copies of the suite across nine jobs;
today it executes nine copies across nine jobs. This cuts the repeated main-suite
combinations by 44%, but does not imply a 44% reduction in all CI time. The PR
profile uses two macOS jobs instead of three, which also reduces platform demand.

Inference: the latest Windows / Node 24 job provides a rough execution model:
`217 seconds setup/other work + 807 seconds tests / 2 = 620.5 seconds`, or about
10.3 minutes with perfectly balanced shards starting together. Extra imports,
shard imbalance, artifact handling, and runner waits can increase that result.

Keep the existing egg-bin, egg-scripts, tegg adapter, example, static-check, and
E2E coverage initially. The added planner and coverage aggregation also consume
runner slots and must be included in the comparison.

Use the full profile for `merge_group`, `push` to `next`, and an explicit full
validation/manual mode. Keep the full profile unsharded initially to avoid
doubling runner demand. Reconsider its long jobs after the PR rollout and test
improvements have produced capacity measurements.

Tradeoff: a defect specific to Node 22 or 26 on macOS/Windows may first appear in
the merge queue. This is acceptable only if full checks are enforced before
merge. If the repository also permits merges without that queue, retain the
full PR profile. If every PR update must validate all nine combinations, apply
the test improvements first and benchmark limited sharding under that policy;
the 8–12 minute PR target does not apply automatically.

For docs-only changes, run the relevant formatting and site checks and complete
the final gate. Implement selection inside the workflow, including `reopened`
PRs; a required workflow skipped by `paths-ignore` can leave a pending check.
Unknown paths or failed change detection must select full validation or fail,
never silently skip it. See [GitHub's skip behavior](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).

Keep cancellation scoped to superseded runs of the same PR or branch. Include
the shard index in any job-level concurrency key, so sibling shards cannot
cancel each other. Preserve separate merge-group runs and `fail-fast: false`
during evaluation.

## 3. Shard tests without losing coverage or preparation

Start with native Vitest `--shard=1/2` and `--shard=2/2`, passed through the
existing `ut run test -- ...` or `ut run ci -- ...` command. Retain lifecycle
scripts, retries, timeouts, and existing console/JSON reporters. Add the blob
reporter explicitly where reports must be merged.

Vitest shards files rather than individual test cases. Measure each shard and
its slowest files. If the longest shard exceeds the mean by more than 20%, use
historical full-file timings to balance a deterministic partition by
project-plus-path, with a stable fallback for new files. Do not immediately
increase the shard count. See [Vitest sharding](https://vitest.dev/guide/improving-performance).

Each shard gets its own runner, checkout, MySQL, and Redis. The root `pretest`
executes workspace hooks, including the ORM database reset, so all initial
main-suite shards still need those services. Removing service setup requires
scoping preparation as well as test selection. Keep `packages/logger` file
serialization and the egg-bin Windows worker cap until separate evidence
supports changing them.

For the Linux / Node 24 coverage pair, collect coverage in both shards. Preserve
the Vitest blob and raw coverage inputs needed by the installed Vitest 5.0.1
merge path, use unique artifact names, and validate their union against an
unsharded run of the same commit. Merge once, then upload the resulting main-suite
report to Codecov; retain the bin/scripts contributions and existing thresholds.
Missing shard reports must fail the gate. A partial shard's coverage must never
stand in for the complete main suite.

Do not build the monorepo before these tests or restore generated `dist/` and
fixture `.egg` directories. Preserve the dedicated CLI jobs' required builds.
Compare discovered file sets per OS/Node: shard sets must be disjoint and their
union must match the unsharded baseline, including recorded skips.

## 4. Reduce the work inside tests

Use the measured slow files to order changes: `plugins/schedule`,
`plugins/development`, `plugins/mock` cluster tests, `packages/cluster`, and
the Egg logger tests.

Replace fixed readiness sleeps with bounded waits for the exact event, IPC
message, log record, file condition, or HTTP readiness condition being asserted.
Keep diagnostic output on timeout. Scheduling and timeout behavior still need
real integration coverage: do not replace real 4-second intervals with zero-time
assertions or assume fake timers control child processes.

Share fixture startup only where test state and lifecycle semantics permit it.
Audit process cleanup, temporary directories, ports, Redis keys, and database
state before increasing concurrency. Continue using per-app `TeggScope` state.
Move pure logic assertions to smaller unit tests only when existing end-to-end
behavior remains covered.

Retain current retries while fixing identified failures, but report every retry.
Do not use larger timeouts, extra retries, additional skips, or removal of the
logger serialization as a speed optimization. Benchmark worker counts per OS;
more workers can increase child-process contention.

## 5. Secondary experiments

| Experiment                                  | Rationale and acceptance condition                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persist Vitest's filesystem transform cache | `fsModuleCache: true` is already enabled, but its directory is not among the workflow's explicit caches. Trial a cache scoped by OS, architecture, exact Node/Vitest/tool versions and relevant inputs. Keep it only if cold/warm runs show a net benefit after transfers and correct invalidation. |
| Tighten Node compile-cache restore keys     | A sampled Node 24 job restored a Node 26 cache via the OS-only fallback. Remove cross-version fallback and measure net benefit. Keep coverage correctness independent of compile-cache reuse.                                                                                                       |
| Reduce redundant cache writes               | Measure restore/install/save as a unit. Coordinate writers for a shared key while retaining useful PR-local caches. Dependencies install quickly already, so a new cache is not automatically beneficial.                                                                                           |
| Optimize Windows service setup              | MySQL setup cost about 95–102 seconds in the latest run. Consider pinned/preinstalled binaries only after checking runner-image stability. Do not assume Linux service containers work on Windows runners.                                                                                          |
| Build and pack E2E tarballs once            | Three E2E jobs each build and pack the workspace. A producer artifact could reduce aggregate work, but its new dependency and transfer time can increase feedback latency. Benchmark before adoption; keep fresh per-consumer installs and current snapshot checks.                                 |
| Larger hosted runners                       | Compare test duration, start delay, flake rate, and actual cost on the slow jobs. Consider only if measured capacity or CPU limits justify them.                                                                                                                                                    |

The repository ignores lockfiles, so do not introduce a cache key that hashes
only an absent tracked lockfile. Use the current catalogs/manifests and record
resolved tool/dependency versions for experiments. A committed-lockfile policy
is a separate reproducibility decision.

GitHub caches are immutable and scoped to refs; cache writers and fallback keys
need to account for that behavior. See [dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).

## Rollout and acceptance

| Stage                                   | Main files or area                                             | Exit condition                                                                                     |
| --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A: measurements and reliability         | CI workflow, benchmark scripts, inspector tests                | Durable timing artifacts; explicit final-gate behavior; collision regression coverage              |
| B: PR profile and two-way shards        | CI workflow, planner/shard configuration, coverage aggregation | Same test inventory per retained combination; complete coverage; full matrix enforced before merge |
| C: test runtime reductions              | Schedule, development, mock, cluster, logger tests             | Same assertions and lifecycle coverage, lower measured duration, no new state leaks                |
| D: optional setup/cache/E2E experiments | Cache steps and E2E workflow                                   | Net reduction in end-to-end latency or runner cost, with no correctness loss                       |

For each stage, benchmark the same commit and resolved dependencies with warm
and cold caches; alternate baseline/candidate runs to reduce load bias. Start
with at least five paired runs for direction, then observe at least 30 completed
code-PR runs before evaluating p50/p95 and flake-rate trends. Classify expected
platform skips separately from missing tests.

Acceptance targets for ordinary PRs are p50 end-to-end feedback at or below
12 minutes and p95 at or below 20 minutes when measured runner waits permit it,
with execution targeted at 8–12 minutes and at least 25% fewer unweighted
runner-minutes. These targets are provisional. Track full-profile latency and
total PR-to-merge latency separately so faster PR checks cannot hide a slower
merge queue.

Reject or roll back a change if tests disappear, coverage inputs are incomplete,
flake/retry rates rise, shard imbalance exceeds the agreed threshold, or runner
waits erase the execution benefit. Keep a full-profile override and independently
revertible changes for matrix selection, sharding, and caches.
