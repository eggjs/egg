import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    urllib: 'src/urllib.ts',
  },
  bundle: false, // unbundle mode - preserves file structure
});