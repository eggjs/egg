import { defineProject } from 'vite-plus';

export default defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
