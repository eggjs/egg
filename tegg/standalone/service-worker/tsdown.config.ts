import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    level: 'error',
    // Loaded through the package's eggModule dependency scan, not a code import.
    ignore: ['@eggjs/service-worker-controller'],
  },
});
