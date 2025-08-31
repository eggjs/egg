const assert = require('assert');
const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.bootLog.push('app.js in plugin');
  // make sure app.js change app.config.appSet = true on configWillLoad
  assert(app.config.appSet === true);
  app.beforeStart(async () => {
    await scheduler.wait(5);
    app.bootLog.push('beforeStart');
  });

  app.ready(() => {
    app.bootLog.push('ready');
  });
};
