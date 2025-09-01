'use strict';

module.exports = function(app) {
  app.custom = {};
  app.messenger.broadcast('custom-framework-worker', 123);
  app.messenger.on('custom-framework-agent', function(data) {
    app.agent = data;
  });
};
