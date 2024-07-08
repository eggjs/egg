import { EggLoggers, EggLoggersOptions } from 'egg-logger';
import { setCustomLogger } from 'onelogger';
import type { EggApplicationCore } from '../egg.js';

export function createLoggers(app: EggApplicationCore) {
  const loggerOptions = {
    ...app.config.logger,
    type: app.type,
    localStorage: app.ctxStorage,
  } as EggLoggersOptions;

  // set DEBUG level into INFO on prod env
  if (app.config.env === 'prod' && loggerOptions.level === 'DEBUG' && !app.config.logger.allowDebugAtProd) {
    loggerOptions.level = 'INFO';
  }

  const loggers = new EggLoggers({
    logger: loggerOptions,
    customLogger: app.config.customLogger,
  });

  // won't print to console after started, except for local and unittest
  app.ready(() => {
    if (app.config.logger.disableConsoleAfterReady) {
      loggers.disableConsole();
      loggers.coreLogger.info('[egg:lib:core:logger] disable console log after app ready');
    }
  });

  // set global logger
  for (const loggerName of Object.keys(loggers)) {
    setCustomLogger(loggerName, loggers[loggerName]);
  }
  // reset global logger on beforeClose hook
  app.lifecycle.registerBeforeClose(() => {
    for (const loggerName of Object.keys(loggers)) {
      setCustomLogger(loggerName, undefined);
    }
  });
  loggers.coreLogger.info('[egg:lib:core:logger] init all loggers with options: %j', loggerOptions);
  return loggers;
}
