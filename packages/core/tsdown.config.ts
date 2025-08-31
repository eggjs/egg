import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
});