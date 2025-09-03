import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false, // Use explicit imports instead of globals
    environment: 'node',
    include: ['test/**/*.test.{ts,js}'],
    exclude: [
      'test/fixtures/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'test/**',
      ],
    },
  },
});