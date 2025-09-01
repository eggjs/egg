import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/test/fixtures/**',
      '**/node_modules/**',
    ],
  },
});