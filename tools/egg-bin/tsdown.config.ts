import { defineConfig } from 'tsdown';

export default defineConfig({
  unbundle: true,
  fixedExtension: false,
  // MEMO: @oclif/core only works in unbundle mode (already default)
  unused: {
    level: 'error',
    // @vitest/coverage-v8 is loaded by vitest at runtime as a coverage provider, not directly imported
    // @eggjs/core is used by manifest command and scripts/manifest-generate.mjs
    ignore: ['utility', '@vitest/coverage-v8', '@eggjs/core'],
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist',
    },
  ],
});
