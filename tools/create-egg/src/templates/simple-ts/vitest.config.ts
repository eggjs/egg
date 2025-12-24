import { defineConfig } from '@voidzero-dev/vite-plus';

export default defineConfig({
  test: {
    setupFiles: ['test/setup.ts'],
  },
});
