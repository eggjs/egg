import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  // unbundle: true,
  dts: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
});
