import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    pool: 'threads',
    isolate: false,
    testTimeout: 10000,
    hookTimeout: 20000,
    exclude: ['test/fixtures/**', 'test/benchmark/**', '**/node_modules/**', '**/dist/**'],
  },
});
