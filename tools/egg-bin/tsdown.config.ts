import { defineConfig } from '@voidzero-dev/vite-plus/lib';

export default defineConfig({
  // MEMO: @oclif/core only works in unbundle mode (already default)
  unused: {
    level: 'error',
    ignore: ['utility'],
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist',
    },
  ],
});
