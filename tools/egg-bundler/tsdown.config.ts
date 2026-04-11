import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  copy: [{ from: 'src/scripts/generate-manifest.mjs', to: 'dist/scripts/generate-manifest.mjs' }],
  unused: {
    level: 'warn',
    ignore: ['@utoo/pack', 'egg'],
  },
});

export default config;
