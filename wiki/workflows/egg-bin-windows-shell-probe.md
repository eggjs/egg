---
title: Egg-bin Windows shell probe hotspot
type: workflow
summary: How PR #6014 diagnosed hosted-Windows egg-bin startup slowness and why the final fix only presets SHELL.
source_files:
  - tools/egg-bin/bin/run.js
  - tools/egg-bin/test/fixtures/my-egg-bin/bin/run.js
  - https://github.com/eggjs/egg/pull/6014
  - https://github.com/eggjs/egg/actions/runs/28316987317
  - https://github.com/eggjs/egg/actions/runs/28317525249
updated_at: 2026-06-28
status: active
---

## Finding

The Windows `test-egg-bin` hotspot in PR #6014 was repeated child-process CLI
startup, not Vitest sharding, globby, or `egg-bin test` config construction.
Hosted Windows runners started spawned `egg-bin` children without `SHELL`, which
made oclif synchronously probe the parent process shell through PowerShell/CIM.
Files such as `tools/egg-bin/test/commands/test.test.ts` amplify that cost
because they spawn many child `egg-bin` processes.

Inference: the hosted-runner slowdown looked like a long test file, but the
dominant repeated cost happened before the command's own test work. Temporary
CI-only timing showed normal `test` command globby/config work was tiny, while
pre-command oclif startup dominated.

## Final Fix

The final code fix is deliberately small:

- in `tools/egg-bin/bin/run.js`, preset `process.env.SHELL` on Windows when it is
  missing, deriving the shell name from `COMSPEC`/`ComSpec` or falling back to
  `cmd.exe`
- do the same in `tools/egg-bin/test/fixtures/my-egg-bin/bin/run.js`, because the
  custom CLI fixture has its own oclif entrypoint
- dynamically import `@oclif/core` after the preset, so oclif observes `SHELL`
  before it initializes

The diagnostic instrumentation used during the investigation was removed from
the final PR. The CI workflow stays as one Windows `test-egg-bin` leg; sharding
is not needed after the shell-probe fix.

## Evidence

Observed on CI while diagnosing PR #6014:

- Before the fix, `test/commands/test.test.ts` on Windows took about 1,077s.
- After the main entrypoint preset, `test/commands/test.test.ts` dropped to about
  42-48s.
- After applying the same preset to the custom CLI fixture, `test/my-egg-bin.test.ts`
  dropped from about 299s to about 7.6s.
- After removing the diagnostic code and keeping the minimal fix, the single
  Windows `test-egg-bin` job passed in about 3m06s; file-level timings included
  `test/commands/test.test.ts` at 48.8s, `test/my-egg-bin.test.ts` at 8.5s, and
  `test/commands/cov.test.ts` at 30.0s.

Remaining slow cases are real test/app startup work, mainly TypeScript fixture
cases around 9-10s, not repeated oclif shell probing.
