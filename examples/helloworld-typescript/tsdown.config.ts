import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['app.ts', 'config/**/*.ts', 'app/**/*.ts'],
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
});
