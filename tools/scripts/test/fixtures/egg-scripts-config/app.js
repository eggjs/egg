const { scheduler } = require('node:timers/promises');

module.exports = app => {
  if (process.env.ERROR) {
    app.logger.error(new Error(process.env.ERROR));
  }

  app.beforeStart(async () => {
    await scheduler.wait(parseInt(process.env.WAIT_TIME));
  });
};
