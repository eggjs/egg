const { getCustomLogger, getLogger } = require('onelogger');

module.exports = app => {
  app.get('/', async ctx => {
    const myLogger = getCustomLogger('myLogger', 'custom-logger-label');
    const logger = getLogger();
    myLogger.info('hello myLogger');
    logger.warn('hello logger');
    ctx.body = { ok: true };
  });
};
