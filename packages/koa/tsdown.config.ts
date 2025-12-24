import { defineConfig } from '@voidzero-dev/vite-plus/lib';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    ignore: ['@types/content-disposition'],
  },
});
