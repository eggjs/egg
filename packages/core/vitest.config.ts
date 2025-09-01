import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js}'],
    exclude: [
      'test/fixtures/**',
      'test/benchmark/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
