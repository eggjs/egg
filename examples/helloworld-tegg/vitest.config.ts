import { defineProject } from '@voidzero-dev/vite-plus';

export default defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
