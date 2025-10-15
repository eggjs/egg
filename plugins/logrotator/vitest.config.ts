import { defineProject, type UserWorkspaceConfig } from "vitest/config";

const config: UserWorkspaceConfig = defineProject({
  test: {
    include: ["test/**/*.test.ts"],
  },
});

export default config;
