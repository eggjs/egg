import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  dts: true,
  unused: true,
  exports: {
    devExports: true,
  },
});
