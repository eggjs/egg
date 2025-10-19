import { defineConfigFactory, type EggConfigFactory } from 'egg';

const factory: EggConfigFactory = defineConfigFactory(appInfo => {
  return {
    tegg: {
      readModuleOptions: {
        // https://github.com/eggjs/tegg/blob/33e749cc82a74411684db360b30f24ed0083dd95/core/common-util/src/ModuleConfig.ts#L29
        deep: 10,
        cwd: appInfo.baseDir,
      },
    },
  };
});

export default factory;
