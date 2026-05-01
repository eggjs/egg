import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  fixedExtension: false,
  external: [/^@eggjs\//, 'egg', '@utoo/pack', /\.node$/],
  copy: [{ from: 'src/scripts/generate-manifest.mjs', to: 'dist/scripts/' }],
  unused: {
    level: 'warn',
    ignore: ['@utoo/pack', 'egg', 'tsx', '@eggjs/core'],
  },
});

export default config;
