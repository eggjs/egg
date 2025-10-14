import path from 'node:path';

import { defineConfigFactory, type PartialEggConfig, type EggConfigFactory } from 'egg';

const config: EggConfigFactory = defineConfigFactory(appInfo => {
  const config = {} as PartialEggConfig;

  config.keys = '123123';

  config.view = {
    root: path.resolve(appInfo.baseDir, './'),
  };
  return config;
});

export default config;
