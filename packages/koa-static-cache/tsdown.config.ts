import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
  unbundle: true,
  dts: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
});

export default config;
