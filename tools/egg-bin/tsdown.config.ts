import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config = defineConfig({
  ...(baseConfig as UserConfig),
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
