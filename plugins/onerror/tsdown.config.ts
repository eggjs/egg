import { defineConfig } from '@voidzero-dev/vite-plus/lib';

export default defineConfig({
  copy: [
    {
      from: 'src/lib/onerror_page.mustache.html',
      to: 'dist/lib',
    },
  ],
});
