'use strict';

module.exports = {
  logger: {
    // 开发环境，将 INFO 以上级别的应用日志和 WARN 以上级别的系统日志输出到 stdout
    level: 'DEBUG',
    consoleLevel: 'INFO',
    coreLogger: {
      consoleLevel: 'WARN',
    },
    // 在 local 或者 unittest 环境下，默认不缓存日志，直接写入磁盘
    buffer: false,
  },
};
