'use strict';

module.exports = function(app) {
  app.on('server', () => {
    app.serverEmit = true;
  });
};
