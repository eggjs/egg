import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  ...(baseConfig as UserConfig),
  unbundle: false,
  entry: ['src/index.ts', 'src/cli.ts'],
  copy: [
    {
      from: 'src/templates',
      to: 'dist/templates',
    },
  ],
});

export default config;
