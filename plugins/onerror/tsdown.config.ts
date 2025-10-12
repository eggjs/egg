import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
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

export default config;
