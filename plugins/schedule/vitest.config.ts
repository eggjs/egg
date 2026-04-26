import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
