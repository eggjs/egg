import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  unused: true,
  exports: {
    devExports: true,
  },
});
