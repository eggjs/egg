import { defineConfig } from 'tsdown';

const config = defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  // MEMO: @oclif/core only work on unbundle mode
  unbundle: true,
  dts: true,
  unused: {
    level: 'error',
    ignore: ['utility'],
  },
  exports: {
    devExports: true,
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist/scripts',
    },
  ],
});

export default config;
