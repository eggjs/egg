import { defineProject } from '@voidzero-dev/vite-plus';

export default defineProject({
  test: {
    testTimeout: 10000,
    hookTimeout: 20000,
    exclude: ['test/fixtures/**', 'test/benchmark/**', '**/node_modules/**', '**/dist/**'],
  },
});
