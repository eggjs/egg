const { scheduler } = require('node:timers/promises');

module.exports = app => {
  // set timeout let testcase ran before ready
  app.beforeStart(async function() {
    await scheduler.wait(1000);
  });
};
