import { defineConfig, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineConfig({
  test: {
    testTimeout: 20000,
  },
});

export default config;
