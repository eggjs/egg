module.exports = app => {
  app.on('server', server => {
    app.serverKeepAliveTimeout = server.keepAliveTimeout || 5000;
  });
};
