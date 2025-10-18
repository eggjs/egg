import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  unused: {
    level: 'error',
  },
  dts: true,
  exports: {
    devExports: true,
  },
});

export default config;
