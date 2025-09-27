'use strict';

const path = require('path');

module.exports = () => {
  const exports = {
    logrotator: {
      filesRotateByHour: [path.join(__dirname, '../logs', 'logrotator', 'hour.log')],
      filesRotateBySize: [
        path.join(__dirname, '../logs', 'logrotator', 'egg-web.log'),
        path.join(__dirname, '../logs', 'logrotator', 'size.log'),
      ],
      maxFileSize: 1024,
      maxFiles: 2,
      rotateDuration: 30000,
    },

    customLogger: {
      bizLogger: {
        file: path.join(__dirname, '../logs', 'mybiz', 'biz.log'),
        consoleLevel: 'NONE',
      },
      relativeLogger: {
        file: 'relative.log',
        consoleLevel: 'NONE',
      },
      sizeLogger: {
        file: path.join(__dirname, '../logs', 'logrotator', 'size.log'),
      },
      hourLogger: {
        file: path.join(__dirname, '../logs', 'logrotator', 'hour.log'),
      },
      foo1Logger: {
        file: path.join(__dirname, '../logs', 'logrotator', 'foo1.log'),
      },
    },
  };
  return exports;
};
