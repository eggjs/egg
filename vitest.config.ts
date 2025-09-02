import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    projects: ['**/vitest.config.ts'],
    include: ['**/test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      exclude: ['**/test/fixtures/**'],
    },
  },
});
