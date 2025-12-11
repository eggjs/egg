import { defineConfig, type PartialEggConfig } from '../lib/define.ts';

const config: PartialEggConfig = defineConfig({
  logger: {
    coreLogger: {
      consoleLevel: 'WARN',
    },
  },
});

export default config;
