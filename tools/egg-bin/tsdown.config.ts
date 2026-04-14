import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  fixedExtension: false,
  external: [/^@eggjs\//, 'egg'],
  exports: {
    devExports: true,
  },
  // MEMO: @oclif/core only works in unbundle mode (already default)
  unused: {
    level: 'error',
    // @vitest/coverage-v8 is loaded by vitest at runtime as a coverage provider, not directly imported
    ignore: ['utility', '@vitest/coverage-v8'],
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist',
    },
  ],
});
