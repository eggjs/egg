import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
  copy: [
    {
      from: 'src/templates',
      to: 'dist/templates',
    },
  ],
});
