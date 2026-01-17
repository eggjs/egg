import { defineConfig } from 'vite-plus/lib';

export default defineConfig({
  unbundle: false,
  entry: ['src/index.ts', 'src/cli.ts'],
  copy: [
    {
      from: 'src/templates',
      to: 'dist',
    },
  ],
});
