import { defineConfig, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    globals: true,
  },
});

export default config;
