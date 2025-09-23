import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    testTimeout: 20000,
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/bench/**', '**/node_modules/**', '**/dist/**'],
  },
});
