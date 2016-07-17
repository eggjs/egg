'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/message', app.controller.message);
};
