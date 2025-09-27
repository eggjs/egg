'use strict';

const path = require('path');

module.exports = appInfo => {
  const exports = {
    logrotator: {
      gzip: true,
      filesRotateBySize: [
        path.join(appInfo.baseDir, `logs/${appInfo.name}/egg-web.log`),
        path.join(appInfo.baseDir, `logs/${appInfo.name}/egg-web.log`),
        'egg-web.log',
        // ignore unexist file
        path.join(appInfo.baseDir, `logs/${appInfo.name}/no-exist.log`),
      ],
      maxFileSize: 1,
      maxFiles: 2,
      rotateDuration: 60000,
    },
  };
  return exports;
};
