import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: [
      'test/fixtures/**',
      'test/benchmark/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
