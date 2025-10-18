import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      'plugins/*',
      'tools/create-egg',
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
