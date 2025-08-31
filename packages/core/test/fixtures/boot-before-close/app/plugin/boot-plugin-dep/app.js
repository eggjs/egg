module.exports = app => {
  app.beforeClose(async () => {
    app.bootLog.push('beforeClose in plugin dep');
  });
};
