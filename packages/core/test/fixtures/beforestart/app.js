const { scheduler } = require('node:timers/promises');

module.exports = function (app) {
  app.beforeStart(function () {
    app.beforeStartFunction = true;
  });
  app.beforeStart(async function () {
    await scheduler.wait(1000);
    app.beforeStartGeneratorFunction = true;
  });
  app.beforeStart(async function () {
    await scheduler.wait(1000);
    app.beforeStartTranslateAsyncFunction = true;
  });
  app.beforeStart(async () => {
    await scheduler.wait(1000);
    app.beforeStartAsyncFunction = true;
  });
  app.beforeStartFunction = false;
  app.beforeStartTranslateAsyncFunction = false;
  app.beforeStartGeneratorFunction = false;
  app.beforeStartAsyncFunction = false;
};
