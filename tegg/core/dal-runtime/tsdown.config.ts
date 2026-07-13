import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  copy: [
    {
      from: 'src/templates',
      to: 'dist/templates',
    },
  ],
});
