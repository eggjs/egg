import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  ...(baseConfig as UserConfig),
  entry: 'src/**/*.ts',
  copy: [
    {
      from: 'src/config/favicon.png',
      to: 'dist/config/favicon.png',
    },
  ],
});

export default config;
