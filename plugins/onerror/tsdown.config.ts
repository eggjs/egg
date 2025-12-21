import { defineConfig } from 'tsdown';

export default defineConfig({
  copy: [
    {
      from: 'src/lib/onerror_page.mustache.html',
      to: 'dist/lib',
    },
  ],
});
