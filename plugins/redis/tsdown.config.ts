import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  // unbundle: true,
  unused: {
    level: 'error',
  },
  dts: true,
  exports: {
    devExports: true,
  },
});
