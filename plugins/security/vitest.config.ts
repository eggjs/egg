import { defineConfig, type UserWorkspaceConfig } from "vitest/config";

const config: UserWorkspaceConfig = defineConfig({
  test: {
    hookTimeout: 20000,
    include: ["test/**/*.test.ts"],
  },
});

export default config;
