import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: {
    index: "src/index.ts",
    agent_worker: "src/agent_worker.ts",
    app_worker: "src/app_worker.ts",
  },
  unbundle: true,
  dts: true,
  unused: {
    level: "error",
  },
  exports: {
    devExports: true,
  },
});

export default config;
