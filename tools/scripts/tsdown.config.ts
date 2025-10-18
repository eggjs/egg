import { defineConfig } from 'tsdown';

import baseConfig from '../tsdown.config.ts';

export default defineConfig({
  ...baseConfig,
  entry: 'src/**/*.ts',
  // MEMO: @oclif/core only work on unbundle mode
  unbundle: true,
});
