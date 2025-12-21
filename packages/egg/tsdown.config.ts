import { defineConfig } from 'tsdown';

export default defineConfig({
  copy: [
    {
      from: 'src/config/favicon.png',
      to: 'dist/config/favicon.png',
    },
  ],
});
