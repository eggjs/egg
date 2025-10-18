import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config = defineConfig({
  ...(baseConfig as UserConfig),
  entry: 'src/**/*.ts',
  // MEMO: @oclif/core only work on unbundle mode
  unbundle: true,
});

export default config;
