import {
  defineConfigFactory,
  type EggConfigFactory,
  type PartialEggConfig,
} from "egg";

const config: EggConfigFactory = defineConfigFactory((appInfo) => {
  const config = {
    keys: "multipart-ts-test",
    appInfo: appInfo,
    multipart: {
      mode: "file",
    },
  } as PartialEggConfig;
  return config;
});

export default config;
