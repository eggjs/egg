import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      exclude: ["**/test/**"],
    },
  },
});
