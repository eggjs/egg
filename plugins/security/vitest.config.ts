import { defineConfig, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineConfig({
  test: {
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
  },
});

export default config;
