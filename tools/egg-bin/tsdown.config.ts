import { defineConfig } from 'tsdown';

import baseConfig from '../tsdown.config.ts';

const config = defineConfig({
  ...baseConfig,
  // MEMO: @oclif/core only work on unbundle mode
  unbundle: true,
  unused: {
    level: 'error',
    ignore: ['utility'],
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist/scripts',
    },
  ],
});

export default config;
