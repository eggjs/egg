import path from 'node:path';

import { defineConfigFactory, type PartialEggConfig } from 'egg';

export default defineConfigFactory((appInfo): PartialEggConfig => {
  return {
    static: {
      prefix: '/public/',
      dir: path.join(appInfo.baseDir, 'app/public'),
      // dirs: [ dir1, dir2 ] or [ dir1, { prefix: '/static2', dir: dir2 } ],
      // support lazy load
      dynamic: true,
      preload: false,
      buffer: false,
      maxFiles: 1000,
    },
  };
});
