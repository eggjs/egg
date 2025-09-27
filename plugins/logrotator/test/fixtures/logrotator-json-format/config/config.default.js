'use strict';

const path = require('path');

module.exports = () => {
  const exports = {
    logger: {
      outputJSON: true,
    },
    logrotator: {
      filesRotateByHour: [
        path.join(__dirname, '../logs', 'logrotator', 'hour.log'),
        path.join(__dirname, '../logs', 'logrotator', 'hour.json.log'),
      ],
      filesRotateBySize: [
        path.join(__dirname, '../logs', 'logrotator', 'size.log'),
        path.join(__dirname, '../logs', 'logrotator', 'size.json.log'),
      ],
      maxFileSize: 1,
      maxFiles: 2,
    },
    customLogger: {
      dayLogger: {
        file: path.join(__dirname, '../logs', 'logrotator', 'day.log'),
      },
      sizeLogger: {
        file: path.join(__dirname, '../logs', 'logrotator', 'size.log'),
      },
      hourLogger: {
        file: path.join(__dirname, '../logs', 'logrotator', 'hour.log'),
      },
    },
  };
  return exports;
};
