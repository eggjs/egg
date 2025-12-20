import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  // MEMO: @oclif/core only works in unbundle mode (already default)
  unused: {
    level: 'error',
    ignore: ['utility'],
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist/scripts',
    },
  ],
});

export default config;
