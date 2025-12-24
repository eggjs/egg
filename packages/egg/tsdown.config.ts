import { defineConfig } from '@voidzero-dev/vite-plus/lib';

export default defineConfig({
  copy: [
    {
      from: 'src/config/favicon.png',
      to: 'dist/config',
    },
  ],
});
