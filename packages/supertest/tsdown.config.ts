import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  dts: true,
  unused: {
    level: 'error',
    ignore: ['@types/superagent'],
  },
  exports: {
    devExports: true,
  },
});

export default config;
