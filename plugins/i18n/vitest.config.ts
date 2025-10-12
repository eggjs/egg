import { defineConfig, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});

export default config;
