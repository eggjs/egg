import { defineConfig } from 'vite-plus/lib';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    ignore: ['@types/superagent'],
  },
});
