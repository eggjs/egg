const { scheduler } = require('node:timers/promises');

module.exports = app => {
  const timeout = process.env.EGG_MASTER_CLOSE_TIMEOUT || 5000;

  app.beforeClose(async () => {
    app.logger.info('agent worker start close: ' + Date.now());
    await scheduler.wait(timeout * 2);
    app.logger.info('agent worker: never called after timeout');
  });
};
