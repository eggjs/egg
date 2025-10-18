import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../tsdown.config.ts';

const config: UserConfig = defineConfig({
  ...baseConfig,
  entry: 'src/**/*.ts',
  copy: [
    {
      from: 'src/config/favicon.png',
      to: 'dist/config/favicon.png',
    },
  ],
});

export default config;
