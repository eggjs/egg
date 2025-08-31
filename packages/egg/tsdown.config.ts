import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // allow import from "egg/urllib"
    urllib: 'src/urllib.ts',
  },
  dts: true,
  unbundle: true,
  exports: {
    devExports: true,
  },
});