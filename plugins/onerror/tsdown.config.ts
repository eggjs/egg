import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  dts: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
  copy: [
    {
      from: 'src/lib/onerror_page.mustache.html',
      to: 'dist/lib/onerror_page.mustache.html',
    },
  ],
});
