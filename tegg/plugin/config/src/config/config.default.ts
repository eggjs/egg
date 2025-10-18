import { defineConfigFactory } from 'egg';
import { type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';

export default defineConfigFactory(appInfo => {
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

declare module 'egg' {
  interface EggAppConfig {
    /**
     * tegg config
     */
    tegg: {
      readModuleOptions: ReadModuleReferenceOptions;
    };
  }
}
