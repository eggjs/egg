import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tools/**'],
    projects: [
      'packages/*',
      'plugins/*',
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
  },
});
