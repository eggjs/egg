import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
