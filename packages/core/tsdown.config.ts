import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = {
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  dts: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
};

const exportedConfig: UserConfig = defineConfig(config);
export default exportedConfig;
