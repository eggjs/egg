import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    global: 'src/global.ts',
    index: 'src/index.ts',
  },
  fixedExtension: false,
});
