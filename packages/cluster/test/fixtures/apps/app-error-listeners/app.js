'use strict';

module.exports = function(app) {
  // before cluster ready
  app.ready(() => {
    app.beforeReady = app.listeners('error').length;
  });
};
