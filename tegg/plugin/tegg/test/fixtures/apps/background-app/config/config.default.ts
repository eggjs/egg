import { type EggAppInfo } from 'egg';
import path from 'node:path';

export default function (appInfo: EggAppInfo) {
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
  return config;
}
