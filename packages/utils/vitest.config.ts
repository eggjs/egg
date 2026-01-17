import { defineProject } from 'vite-plus';

export default defineProject({
  test: {
    testTimeout: 15000,
    include: ['test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
  },
});
