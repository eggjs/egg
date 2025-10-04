import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  unused: {
    level: 'error',
    ignore: ['@types/content-disposition'],
  },
  exports: {
    devExports: true,
  },
});
