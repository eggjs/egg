import { defineConfig } from 'tsdown';

const config = defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  dts: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
}) as ReturnType<typeof defineConfig>;

export default config;
