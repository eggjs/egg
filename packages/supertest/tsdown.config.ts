import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  ...(baseConfig as UserConfig),
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    level: 'error',
    ignore: ['@types/superagent'],
  },
});

export default config;
