'use strict';

module.exports = function*() {
  const message = this.query.message;

  this.logger.debug('debug %s', message);
  this.logger.info('info %s', message);
  this.logger.warn('warn %s', message);
  this.logger.error(new Error('error ' + message));

  this.coreLogger.debug('core debug %s', message);
  this.coreLogger.info('core info %s', message);
  this.coreLogger.warn('core warn %s', message);
  this.coreLogger.error(new Error('core error ' + message));

  this.body = 'logger';
};
