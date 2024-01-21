const { EggLoggers } = require('egg-logger');
const { setCustomLogger } = require('onelogger');

module.exports = function createLoggers(app) {
  const loggerConfig = app.config.logger;
  loggerConfig.type = app.type;
  loggerConfig.localStorage = app.ctxStorage;

  if (app.config.env === 'prod' && loggerConfig.level === 'DEBUG' && !loggerConfig.allowDebugAtProd) {
    loggerConfig.level = 'INFO';
  }

  const loggers = new EggLoggers(app.config);

  // won't print to console after started, except for local and unittest
  app.ready(() => {
    if (loggerConfig.disableConsoleAfterReady) {
      loggers.disableConsole();
    }
  });

  // set global logger
  for (const loggerName of Object.keys(loggers)) {
    setCustomLogger(loggerName, loggers[loggerName]);
  }
  // reset global logger on beforeClose hook
  app.beforeClose(() => {
    for (const loggerName of Object.keys(loggers)) {
      setCustomLogger(loggerName, undefined);
    }
  });
  loggers.coreLogger.info('[egg:logger] init all loggers with options: %j', loggerConfig);

  return loggers;
};
