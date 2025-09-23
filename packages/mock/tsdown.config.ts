import { defineConfig } from 'tsdown';

export default defineConfig({
  // entry: {
  //   index: 'src/index.ts',
  //   bootstrap: 'src/bootstrap.ts',
  //   register: 'src/register.ts',
  // },
  entry: 'src/**/*.ts',
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
});
