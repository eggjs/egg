import { defineConfig, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      exclude: ['test/**'],
    },
    hookTimeout: 20000,
    testTimeout: 20000,
    env: {
      // disable tegg plugins by default on unittest
      DISABLE_TEGG_PLUGINS: 'true',
      // aop plugin required this flag, otherwise there will be a SyntaxError
      NODE_OPTIONS: '--import=tsx/esm',
    },
    experimental: {
      fsModuleCache: true,
    },
  },
});

export default config;
