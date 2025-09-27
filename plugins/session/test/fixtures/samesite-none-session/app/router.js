'use strict';

module.exports = function (app) {
  app.get('/get', 'home.get');
  app.get('/set', 'home.set');
};
