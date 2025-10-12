import { defineConfig, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
  },
});

export default config;
