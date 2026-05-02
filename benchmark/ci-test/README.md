# CI Test Benchmark

`pnpm run benchmark:ci-test` runs the reusable CI test benchmark harness and writes a Markdown report, a JSON summary, and the raw Vitest JSON reporter output.

## Environment Setup

- Use Node.js `>=22.18.0`.
- Make the repository package manager available. The root `package.json` pins `pnpm@10.28.0`; Corepack or an equivalent local setup should expose that pnpm version.
- Make sure the Utoo CLI is available as `ut`. The CI workflow uses `utooland/setup-utoo` before dependency installation.
- Install workspace dependencies from the repository root with `ut install --from pnpm`.
- Run commands from the repository root so workspace paths and `vitest.config.ts` defaults can be detected.
- Keep Redis and MySQL available when benchmarking suites that require them. The CI test job uses Redis 7 on the default Redis port and MySQL 8 with a `test` database; the benchmark harness mirrors the CI Vitest flags but does not start external services.
- For CI-like metadata, set the relevant environment variables before running the command, for example `CI=1`, `GITHUB_SHA`, `RUNNER_OS`, or worker-related `VITEST_*` variables.

## Usage

```sh
pnpm run benchmark:ci-test
pnpm run benchmark:ci-test -- --coverage
pnpm run benchmark:ci-test -- --output-dir .tmp/ci-benchmark -- pnpm exec vitest run packages/extend2/test/index.test.ts
```

The default output directory is `benchmark/ci-test/<timestamp>`. Use `--output-dir` for a deterministic path when collecting artifacts.

## Outputs

- `report.md`: human-readable benchmark report.
- `report.json`: structured report containing environment, command, wall time, Vitest summary, long-tail file/project durations, and coverage/worker/isolate parameters.
- `vitest-results.json`: raw Vitest JSON reporter output.

The harness only writes reports for explicit benchmark runs. It does not change required checks or CI gate semantics. To collect reports in GitHub Actions, run the command in a manual or optional job and upload the output directory as an artifact.
