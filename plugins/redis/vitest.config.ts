import { defineConfig, type UserWorkspaceConfig } from "vitest/config";

const config: UserWorkspaceConfig = defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
  },
});

export default config;
