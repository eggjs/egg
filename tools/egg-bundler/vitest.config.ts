import { defineConfig, type UserConfig } from 'vitest/config';

const config: UserConfig = defineConfig({
  test: {
    testTimeout: 20000,
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});

export default config;
