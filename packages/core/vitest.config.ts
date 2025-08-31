import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.{ts,js}'],
    exclude: [
      'test/fixtures/**',
      'test/benchmark/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    // Enable Mocha-style hooks (before, after, beforeEach, afterEach)
    setupFiles: ['./test/setup.ts'],
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
  resolve: {
    // alias: {
    //   '@eggjs/core': new URL('./src/index.ts', import.meta.url).pathname,
    // },
  },
});