'use strict';

module.exports = function (app) {
  app.get('/', app.controller.home.index);
  app.post('/update', app.controller.home.update);
};
