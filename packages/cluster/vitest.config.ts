import { defineProject } from '@voidzero-dev/vite-plus';

export default defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    testTimeout: 25000,
    hookTimeout: 25000,
  },
});
