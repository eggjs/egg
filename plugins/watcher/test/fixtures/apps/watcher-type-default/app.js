module.exports = (app) => {
  // app.watcher.watch('xx', () => {});
  app.ready(async () => {
    app.watcher.watch("xx", () => {});
  });
};
