import { type EggAppConfig } from 'egg';
import path from 'node:path';

export default function (appInfo: EggAppConfig) {
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
}
