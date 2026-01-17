import { defineProject } from 'vite-plus';

export default defineProject({
  test: {
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
