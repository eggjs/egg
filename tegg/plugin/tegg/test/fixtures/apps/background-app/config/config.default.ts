import path from 'node:path';

import { type EggAppConfig, type EggAppInfo } from 'egg';

export default function (appInfo: EggAppInfo): EggAppConfig {
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
    backgroundTask: {
      timeout: Infinity,
    },
  };
  return config as unknown as EggAppConfig;
}
