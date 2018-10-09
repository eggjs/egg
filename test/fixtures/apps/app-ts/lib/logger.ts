import { Application, LoggerLevel } from 'egg';

export default (app: Application) => {
  app.logger.info('test');
  app.coreLogger.info('test');
  app.loggers.logger.info('test');
  app.loggers.coreLogger.info('test');
  app.getLogger('logger').info('test');

  const ctx = app.createAnonymousContext();
  ctx.logger.info('test');
  ctx.coreLogger.info('test');
  ctx.getLogger('logger').info('test');

  const level: LoggerLevel = 'DEBUG';
};
