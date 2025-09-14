'use strict';

const path = require('path');

module.exports = appInfo => {
  return {
    keys: 'foo,bar',
    development: {
      watchDirs: [path.join(appInfo.baseDir, 'lib')],
    },
  };
};
