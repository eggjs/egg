import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: "src/**/*.ts",
  dts: true,
  // FIXME: unbundle will missing types https://github.com/fengmk2/tsdown-vs-tsc/blob/main/README.md#tsdown-build-output-missing-types
  unbundle: true,
  unused: {
    level: "error",
  },
  exports: {
    devExports: true,
  },
  copy: [
    {
      from: "src/config/favicon.png",
      to: "dist/config/favicon.png",
    },
  ],
});

export default config;
