import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  unused: {
    level: 'error',
    ignore: ['@eggjs/tegg-plugin', 'egg'],
  },
});
export default config;
