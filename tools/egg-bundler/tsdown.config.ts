import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  fixedExtension: false,
  external: [/^@eggjs\//, 'egg', '@utoo/pack', /\.node$/],
  unused: {
    level: 'warn',
    ignore: ['@utoo/pack', 'egg', 'tsx', '@eggjs/core'],
  },
});

export default config;
