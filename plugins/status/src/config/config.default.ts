import path from 'node:path';

import type { EggAppInfo } from 'egg';

export interface StatusConfig {
  /** Available response keyword. Defaults to `online`. */
  availableResponseKeyword: string;
  /** Unavailable response keyword. Defaults to `offline`. */
  unavailableResponseKeyword: string;
  /** Unavailable HTTP status code. Defaults to `404`. */
  unavailableResponseStatus: number;
  /** Exact request paths to check. Defaults to `['/egg.status']`. */
  checkStatusURLs: string[];
  /** Available when any file exists. Defaults to `['${baseDir}/egg.status']`. */
  checkStatusFiles: string[];
}

export default (appInfo: EggAppInfo): { status: StatusConfig } => ({
  status: {
    availableResponseKeyword: 'online',
    unavailableResponseKeyword: 'offline',
    unavailableResponseStatus: 404,
    checkStatusURLs: ['/egg.status'],
    checkStatusFiles: [path.join(appInfo.baseDir, 'egg.status')],
  },
});
