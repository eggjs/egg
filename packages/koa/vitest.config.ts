import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: [
      'test/fixtures/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});