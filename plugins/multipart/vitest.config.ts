import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
