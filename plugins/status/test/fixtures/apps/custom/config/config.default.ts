import path from 'node:path';

import type { EggAppInfo, PartialEggConfig } from 'egg';
import '@eggjs/status';

export default (appInfo: EggAppInfo): PartialEggConfig => ({
  keys: 'status-test',
  status: {
    availableResponseKeyword: 'ready',
    unavailableResponseKeyword: 'unavailable',
    unavailableResponseStatus: 503,
    checkStatusURLs: ['/health', '/ready'],
    checkStatusFiles: [path.join(appInfo.baseDir, 'first.status'), path.join(appInfo.baseDir, 'second.status')],
  },
});
