import { defineConfig, type UserWorkspaceConfig } from '@voidzero-dev/vite-plus';

const config: UserWorkspaceConfig = defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
  },
});

export default config;
