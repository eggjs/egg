import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  // unbundle: true,
  dts: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
});
