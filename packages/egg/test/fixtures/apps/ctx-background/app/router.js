'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/custom', app.controller.custom);
  app.get('/app_background', app.controller.app);
  app.get('/error', app.controller.error);
  app.get('/sync', app.controller.sync);

};
