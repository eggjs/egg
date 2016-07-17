'use strict';

module.exports = app => {
  app.on('server', server => {
    app.serverEmit = true;
  });
};
