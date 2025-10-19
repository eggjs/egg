import path from 'node:path';

import { defineConfigFactory, type EggConfigFactory } from 'egg';

const factory: EggConfigFactory = defineConfigFactory(appInfo => {
  const config = {
    keys: 'test key',
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
      },
    },
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config;
});

export default factory;
