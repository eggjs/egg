const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.beforeClose(async () => {
    await scheduler.wait(6000);
  });
};
