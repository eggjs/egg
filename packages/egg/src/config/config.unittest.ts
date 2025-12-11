import { defineConfig, type PartialEggConfig } from '../lib/define.ts';

const config: PartialEggConfig = defineConfig({
  logger: {
    consoleLevel: 'WARN',
    // disable buffer for unittest
    buffer: false,
  },
});

export default config;
