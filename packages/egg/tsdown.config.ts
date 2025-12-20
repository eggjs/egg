import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  copy: [
    {
      from: 'src/config/favicon.png',
      to: 'dist/config/favicon.png',
    },
  ],
});

export default config;
