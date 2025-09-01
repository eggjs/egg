'use strict';

const net = require('net');

module.exports = app => {
  // don't use the port that egg-mock defined
  app._options.port = undefined;
  const server = net.createServer();
  server.listen(9500);

  app.beforeClose(() => {
    return server.close();
  });
};
