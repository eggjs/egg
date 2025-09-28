module.exports = app => {
  const appBeforeReadyTracers = [];
  const appAfterReadyTracers = [];

  appBeforeReadyTracers.push(app.tracer);
  appBeforeReadyTracers.push(app.tracer);
  appBeforeReadyTracers.push(app.tracer);

  app.appBeforeReadyTracers = appBeforeReadyTracers;
  app.appAfterReadyTracers = appAfterReadyTracers;

  app.ready(() => {
    appAfterReadyTracers.push(app.tracer);
    appAfterReadyTracers.push(app.tracer);
    appAfterReadyTracers.push(app.tracer);
  });
};
