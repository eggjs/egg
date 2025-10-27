import { defineConfig, type PartialEggConfig } from '../lib/define.ts';

export default defineConfig({
  logger: {
    coreLogger: {
      consoleLevel: 'WARN',
    },
  },
}) as PartialEggConfig;
