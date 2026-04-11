import path from 'node:path';

import type { EggAppInfo } from 'egg';

interface MinimalAppConfig {
  keys: string;
  middleware: string[];
  static: { prefix: string; dir: string };
}

export default (appInfo: EggAppInfo): MinimalAppConfig => {
  return {
    keys: 'minimal-app-keys',
    middleware: ['timing'],
    static: {
      prefix: '/public/',
      dir: path.join(appInfo.baseDir, 'app/public'),
    },
  };
};
