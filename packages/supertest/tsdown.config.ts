import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../tsdown.config.ts';

const config: UserConfig = defineConfig({
  ...baseConfig,
  unused: {
    level: 'error',
    ignore: ['@types/superagent'],
  },
});

export default config;
