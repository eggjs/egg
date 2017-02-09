'use strict';

module.exports = app => {
  app.beforeStart(async () => {
    await Promise.resolve();
    await app.runSchedule('async');
    app.beforeStartExectuted = true;
  });

  app.beforeClose(async () => {
    await Promise.resolve();
    app.beforeCloseExecuted = true;
  });
};
