'use strict';

module.exports = app => {
  app.logger.info('app info');
  app.logger.error(new Error('app error'));

  app.ready(() => {
    app.logger.info('app info after ready');
  });
};
