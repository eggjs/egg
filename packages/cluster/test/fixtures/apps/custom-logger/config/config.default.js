'use strict';

const path = require('path');

module.exports = appInfo => {
  return {
    customLogger: {
      monitorLogger: {
        file: path.join(appInfo.baseDir, 'logs/monitor.log'),
        formatter: meta => meta.message,
      },
    },
  };
};
