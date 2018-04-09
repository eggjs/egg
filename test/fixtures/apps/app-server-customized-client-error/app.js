'use strict';

module.exports = app => {
  app.on('server', () => {
    app.serverEmit = true;
  });
};
