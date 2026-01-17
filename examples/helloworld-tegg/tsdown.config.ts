import { defineConfig } from 'vite-plus/lib';

export default defineConfig({
  entry: ['app.ts', 'config/**/*.ts', 'app/**/*.ts'],
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
  fixedExtension: false,
});
