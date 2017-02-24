'use strict';

const path = require('path');

module.exports = info => {
  return {
    customLogger: {
      myLogger: {
        file: path.join(info.baseDir, 'logs/my.log'),
        formatter: meta => meta.message,
      },
    },
    keys: 'test key',
  };
};
