import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    include: ['test/**/*.test.{ts,js}'],
    exclude: ['test/fixtures/**', '**/node_modules/**', '**/dist/**'],
  },
});
