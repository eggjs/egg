import { defineConfig, type UserWorkspaceConfig } from 'vitest/config';

const isCI = Boolean(process.env.CI);
const isWindowsCI = isCI && process.platform === 'win32';

// In CI, emit a Vitest JSON report next to the benchmark harness so the
// "Report parallelism metrics" step can summarize the real gating run (isolate is
// off, so tests run fully in parallel). Keep this path in sync with the metrics step
// in .github/workflows/ci.yml. Locally we keep the default reporter only.
const CI_VITEST_JSON = 'benchmark/ci-test/ci-run/vitest-results.json';

const config: UserWorkspaceConfig = defineConfig({
  test: {
    pool: 'threads',
    isolate: false,
    reporters: isCI ? ['default', ['json', { outputFile: CI_VITEST_JSON }]] : ['default'],
    ...(isWindowsCI
      ? {
          maxWorkers: 2,
        }
      : {}),
    projects: [
      'packages/*',
      'plugins/*',
      'tools/create-egg',
      'tegg/core/*',
      'tegg/plugin/*',
      'tegg/standalone/*',
      // FIXME: enable this will cause one test file run twice
      // {
      //   extends: true,
      //   test: {
      //     include: ['**/test/**/*.test.ts'],
      //     exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
      //   },
      // },
    ],
    coverage: {
      provider: 'v8',
      exclude: ['**/test/**'],
    },
    hookTimeout: 20000,
    testTimeout: 20000,
    env: {
      // disable tegg plugins by default on unittest, make test speed up
      DISABLE_TEGG_PLUGINS: 'true',
      // Transpile runtime `import()` of .ts files (egg loader resolving
      // fixtures/plugins/app code, and the workspace `src` exports under
      // node_modules) with oxc-node — noticeably faster than tsx and it handles
      // decorators correctly. Requires @oxc-node/core >= 0.1.0, which fixes the
      // earlier "Cannot read properties of undefined (reading 'mode')" crash.
      NODE_OPTIONS: '--import=@oxc-node/core/register',
    },
    // poolOptions: {
    //   forks: {
    //     execArgv: [
    //       // TODO: aop plugin required this flag, otherwise there will be a SyntaxError: Invalid or unexpected token
    //       '--import=tsx/esm',
    //       // TODO: TypeScript enum is not supported in strip-only mode
    //       // '--experimental-transform-types',
    //     ],
    //   },
    // },
    experimental: {
      fsModuleCache: true,
    },
  },
});

export default config;
