import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: {
    index: 'src/index.ts',
  },
});

export default config;
