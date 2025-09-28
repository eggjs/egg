module.exports = app => {
  const appBeforeReadyTracers = [];
  const appAfterReadyTracers = [];

  app.appBeforeReadyTracers = appBeforeReadyTracers;
  app.appAfterReadyTracers = appAfterReadyTracers;

  try {
    appBeforeReadyTracers.push(app.tracer);
    appBeforeReadyTracers.push(app.tracer);
    appBeforeReadyTracers.push(app.tracer);
  } catch (e) {
    app.coreLogger.warn(e);
  }

  app.ready(() => {
    try {
      appAfterReadyTracers.push(app.tracer);
      appAfterReadyTracers.push(app.tracer);
      appAfterReadyTracers.push(app.tracer);
    } catch (e) {
      app.coreLogger.warn(e);
    }
  });
};
