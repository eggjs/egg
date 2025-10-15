import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: {
    index: "src/index.ts",
  },
  unbundle: true,
  unused: {
    level: "error",
    ignore: ["@types/content-disposition"],
  },
  exports: {
    devExports: true,
  },
});

export default config;
