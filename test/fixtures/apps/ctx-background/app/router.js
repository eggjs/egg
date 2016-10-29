'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/error', app.controller.error);
};
