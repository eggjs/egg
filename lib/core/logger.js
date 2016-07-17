'use strict';

const Loggers = require('egg-logger').EggLoggers;

module.exports = function createLoggers(app) {
  const loggerConfig = app.config.logger;
  loggerConfig.type = app.type;

  // prod 环境强制配置 INFO
  if (app.config.env === 'prod' && loggerConfig.level === 'DEBUG') {
    loggerConfig.level = 'INFO';
  }

  const loggers = new Loggers(app.config);

  // 启动成功了，所有日志不输出到终端，
  // 除本地环境，本地环境还是可以根据 consoleLevel 控制日志
  app.ready(() => app.config.env !== 'local' && loggers.disableConsole());

  // 日志切割: 从 logrotater 插件发来的消息
  app.messenger.on('log-reload', () => {
    loggers.reload('got log-reload message');
    loggers.coreLogger.info('[egg:logger] logger reload: got log-reload message from self');
  });
  loggers.coreLogger.info('[egg:logger] init all loggers with options: %j', loggerConfig);

  return loggers;
};
