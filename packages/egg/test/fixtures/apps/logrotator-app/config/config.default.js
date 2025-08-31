'use strict';

exports.logrotator = {
  maxFileSize: 1024,
  maxFiles: 2,
  rotateDuration: 30000
};

exports.keys = 'test key';

exports.customLogger = {
  scheduleLogger: {
    consoleLevel: 'DEBUG',
  },
};
