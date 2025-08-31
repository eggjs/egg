'use strict';

const path = require('path');

module.exports = info => {
  return {
    logger: {
      buffer: false,
    },
    customLogger: {
      customLogger: {
        file: path.join(info.baseDir, 'logs/custom.log'),
      },
    },
    keys: 'test key',
  };
};
