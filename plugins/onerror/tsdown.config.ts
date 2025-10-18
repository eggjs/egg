import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  ...(baseConfig as UserConfig),
  entry: 'src/**/*.ts',
  copy: [
    {
      from: 'src/lib/onerror_page.mustache.html',
      to: 'dist/lib/onerror_page.mustache.html',
    },
  ],
});

export default config;
