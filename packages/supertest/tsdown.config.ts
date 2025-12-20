import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    ignore: ['@types/superagent'],
  },
});

export default config;
