import { defineConfig, type UserConfig } from 'tsdown';

import pluginConfig from '../tsdown.config.ts';

const config: UserConfig = defineConfig({
  ...pluginConfig,
  copy: [
    {
      from: 'src/lib/onerror_page.mustache.html',
      to: 'dist/lib/onerror_page.mustache.html',
    },
  ],
});

export default config;
