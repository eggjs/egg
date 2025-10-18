import path from 'node:path';
import { type EggAppInfo } from 'egg';

export default (appInfo: EggAppInfo) => {
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
};
