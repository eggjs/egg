'use strict';

module.exports = function(app) {
  app.get('/service', app.controller.home.testService);
};
