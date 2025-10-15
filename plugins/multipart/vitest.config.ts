import { defineProject, type UserWorkspaceConfig } from "vitest/config";

const config: UserWorkspaceConfig = defineProject({
  test: {
    hookTimeout: 20000,
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
  },
});

export default config;
