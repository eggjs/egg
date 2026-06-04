import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    pool: 'threads',
    isolate: false,
    testTimeout: 15000,
    include: ['test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
  },
});
