import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  copy: [
    {
      from: 'src/lib/onerror_page.mustache.html',
      to: 'dist/lib/onerror_page.mustache.html',
    },
  ],
});

export default config;
