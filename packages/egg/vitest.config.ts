import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 10000,
    include: ['test/**/*.test.{ts,js}'],
    exclude: [
      'test/fixtures/**',
      'test/bench/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
