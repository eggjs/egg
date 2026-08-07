import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  fixedExtension: false,
  external: [/^@eggjs\//, 'egg', '@utoo/pack', /\.node$/],
  copy: [
    { from: 'src/scripts/generate-manifest.mjs', to: 'dist/scripts/' },
    { from: 'src/compat/leoric/runtime-require-loader.cjs', to: 'dist/compat/leoric/' },
  ],
  unused: {
    level: 'warning',
    ignore: ['@utoo/pack', 'egg', 'tsx', '@eggjs/core'],
  },
});
