---
title: CI parallel test metrics
type: workflow
summary: How CI reports test concurrency, resolved worker settings, retries, and shard inventories.
source_files:
  - vitest.config.ts
  - .github/workflows/ci.yml
  - scripts/ci-reporter.ts
  - scripts/ci-test-benchmark/environment.js
  - scripts/ci-test-benchmark/index.js
  - scripts/ci-test-benchmark/vitest-summary.js
  - scripts/ci-test-benchmark/report.js
  - scripts/ci-test-benchmark/cli.js
  - benchmark/ci-test/README.md
updated_at: 2026-09-24
status: active
---

## Why

The root configuration declares `pool: 'threads'` and `isolate: false`, but a
September 24 inspection of Vitest 5.0.1's resolved projects showed isolated
`forks`. File-based projects do not inherit these root options. The historical
shared-worker findings remain relevant when that mode is explicitly selected.

CI now uploads `execution.json` alongside the existing reports. Its public
Vitest module diagnostics include imports and suite hooks, retry counts, the
full test inventory, shard identity, and resolved project settings. The
benchmark helper uses its worker ceiling when available instead of estimating
it from root configuration text.

## How it is wired (test gating job only)

1. **`vitest.config.ts`** adds a `json` reporter **only when `CI` is set**:
   `reporters: ['default', ['json', { outputFile: 'benchmark/ci-test/ci-run/vitest-results.json' }]]`.
   The default console reporter is preserved; locally the JSON is not written. The
   gating run (`ut run ci`) emits this JSON as a side effect — no extra test run.
2. **`.github/workflows/ci.yml`** `test` job adds a `Report parallelism metrics`
   step (`if: always()`) right after `Run tests`. It calls
   **`node scripts/ci-test-benchmark.js --report-only --vitest-json <path> ...`**
   (direct `node`, not `ut run` — `ut run <script> -- …` re-serializes forwarded
   args into a shell string without re-quoting, so the parentheses in `--name`
   break it).
3. The harness builds a Markdown + JSON report from the JSON and, when
   `GITHUB_STEP_SUMMARY` is set, **appends the report to the job summary** so the
   metrics show on the run page, per OS/Node matrix entry.

Gating is unchanged: pass/fail comes solely from `ut run ci`. The metrics step is
informational and exits `0` even when the JSON is missing.

## The metrics (and how to read them honestly)

Computed in `scripts/ci-test-benchmark/vitest-summary.js` (`computeParallelism`)
from each file's Vitest interval (`startTime`/`endTime`):

- **Execution window** = `max(end) - min(start)` — wall-clock span of test execution.
- **Busy time** = Σ per-file spans (area under the concurrency curve).
- **Avg concurrency** = busy ÷ window (time-weighted mean files running at once).
- **Peak concurrency** = max overlapping intervals (sweep line; ends processed
  before starts at equal timestamps, so a hand-off is not counted as overlap). The
  robust headline signal.
- **Parallel efficiency** = avg ÷ worker ceiling (the ceiling mirrors
  `vitest.config.ts`: Windows CI caps workers, otherwise `os.availableParallelism()`).
- **Critical path** = longest single-file span (wall-clock floor).

**Honesty caveat (verified against Vitest 5 source):** the JSON reporter derives a
file's `startTime`/`endTime` from **test-level timings only** (`min test start ..
max test end`). So the span covers test bodies + per-test `beforeEach`/`afterEach`
but **excludes suite-level `beforeAll`/`afterAll` (where egg boots its apps — the
dominant per-file cost) and module transform/import**. That excluded time still
occupies the worker threads, so **avg concurrency and parallel efficiency are lower
bounds** on real utilization — for `beforeAll`-heavy or transform-bound files avg
can read `< 1` even while peak is high. **Peak concurrency is the most robust
signal.** Fully-skipped files (no test timings, anchored at the reporter-init
timestamp) are dropped so they don't inflate the window. The report carries this
caveat as a footnote.

## Reproduce locally (no CI)

```sh
# Produce a JSON like CI does (CI=1 turns on the json reporter)
CI=1 ut execute vitest run packages/loader-fs plugins/security

# Summarize it (writes report.md/report.json; appends to $GITHUB_STEP_SUMMARY if set)
node scripts/ci-test-benchmark.js --report-only \
  --vitest-json benchmark/ci-test/ci-run/vitest-results.json \
  --output-dir benchmark/ci-test/ci-run
```

`benchmark/ci-test/*/` is gitignored (the `README.md` is kept). The harness is
pure Node builtins, so `--report-only` runs without installing workspace deps.
