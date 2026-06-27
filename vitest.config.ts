import { defineConfig, type UserWorkspaceConfig } from 'vitest/config';

const isWindowsCI = process.env.CI && process.platform === 'win32';

const config: UserWorkspaceConfig = defineConfig({
  test: {
    pool: 'threads',
    isolate: false,
    // Windows CI is more contention-sensitive than posix, so we cap the thread
    // pool. Use the full standard `windows-latest` runner (4 vCPU) instead of the
    // previous hard cap of 2; the suite already retries flaky tests (--retry 2).
    ...(isWindowsCI
      ? {
          maxWorkers: 4,
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
      // TODO: aop plugin required this flag, otherwise there will be a SyntaxError: Invalid or unexpected token
      NODE_OPTIONS: '--import=tsx/esm',
      // FIXME: TypeError: Cannot read properties of undefined (reading 'mode')
      // NODE_OPTIONS: '--import=@oxc-node/core/register',
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
