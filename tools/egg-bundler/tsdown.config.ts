import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  unused: {
    level: 'warn',
    ignore: ['@utoo/pack', 'egg'],
  },
});

export default config;
