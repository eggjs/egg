module.exports = app => {
  app.messenger.on('egg-ready', server => {
    app.emitServer = !!server;
  });
};
