import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
  },
});
