module.exports = app => {
  app.isReady = true;
  app.beforeStart(async () => {
    if (!app.isReady) throw new Error('not ready');
  });
  app.isReady = false;
};
