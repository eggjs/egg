module.exports = app => {
  app.beforeStart(async () => {
    await Promise.resolve();
    app.beforeStartExecuted = true;
  });

  app.ready(async () => {
    await app.runSchedule('async');
  });

  app.beforeClose(async () => {
    await Promise.resolve();
    app.beforeCloseExecuted = true;
  });
};
