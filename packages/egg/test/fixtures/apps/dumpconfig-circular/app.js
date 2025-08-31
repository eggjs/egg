const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.beforeStart(async function() {
    await scheduler.wait(500);
    app.config.foo.push(app.config.foo);
  });
};
