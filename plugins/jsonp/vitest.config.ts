import { defineConfig, type UserWorkspaceConfig } from "vitest/config";

const config: UserWorkspaceConfig = defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});

export default config;
