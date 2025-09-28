import path from 'node:path';

import { defineConfigFactory, type PartialEggConfig } from 'egg';

export default defineConfigFactory(appInfo => {
  const config = {} as PartialEggConfig;

  config.keys = '123123';

  config.view = {
    root: path.resolve(appInfo.baseDir, './'),
  };
  return config;
});
