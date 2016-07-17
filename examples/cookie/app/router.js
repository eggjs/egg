'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/forget', app.controller.forget);
  app.post('/remember', app.controller.remember);
};
