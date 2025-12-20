import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  unbundle: false,
  entry: ['src/index.ts', 'src/cli.ts'],
  copy: [
    {
      from: 'src/templates',
      to: 'dist/templates',
    },
  ],
});

export default config;
