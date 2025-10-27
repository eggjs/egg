import { defineConfig, type PartialEggConfig } from '../lib/define.ts';

export default defineConfig({
  logger: {
    consoleLevel: 'WARN',
    // disable buffer for unittest
    buffer: false,
  },
}) as PartialEggConfig;
