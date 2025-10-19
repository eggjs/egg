import { defineConfig, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineConfig({
  test: {
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
    exclude: ['packages/tsdown.config.ts'],
    coverage: {
      provider: 'v8',
      exclude: ['**/test/**'],
    },
    hookTimeout: 20000,
  },
});

export default config;
