import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    ignore: ['@eggjs/typings'],
  },
});
