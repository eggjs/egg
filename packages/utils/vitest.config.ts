import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js}'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
  },
});
