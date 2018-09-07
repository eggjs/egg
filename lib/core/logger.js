'use strict';

const Loggers = require('egg-logger').EggLoggers;

module.exports = function createLoggers(app) {
  const loggerConfig = app.config.logger;
  loggerConfig.type = app.type;

  if (app.config.env === 'prod' && loggerConfig.level === 'DEBUG' && !loggerConfig.allowDebugAtProd) {
    loggerConfig.level = 'INFO';
  }

  const loggers = new Loggers(app.config);

  // won't print to console after started, except for local and unittest
  app.ready(() => {
    if (loggerConfig.disableConsoleAfterReady) {
      loggers.disableConsole();
    }
  });
  loggers.coreLogger.info('[egg:logger] init all loggers with options: %j', loggerConfig);

  return loggers;
};
