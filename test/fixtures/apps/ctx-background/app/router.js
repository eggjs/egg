'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/app_background', app.controller.app);
  app.get('/error', app.controller.error);
};
