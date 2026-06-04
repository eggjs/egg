import { defineConfig, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineConfig({
  test: {
    pool: 'threads',
    isolate: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
  },
});

export default config;
