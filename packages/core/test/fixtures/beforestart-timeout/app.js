const { scheduler } = require('node:timers/promises');

module.exports = function (app) {
  app.beforeStart(async () => {
    await scheduler.wait(11000);
  });
};
