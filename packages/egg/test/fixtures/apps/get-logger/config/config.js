'use strict';

const path = require('path');

module.exports = appInfo => {
  return {
    customLogger: {
      aLogger: {
        file: path.join(appInfo.baseDir, 'logs', appInfo.name, 'a.log'),
      },
    },

    keys: 'secret key',
  };
};
