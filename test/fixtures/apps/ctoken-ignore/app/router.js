'use strict';

module.exports = app => {
  app.post('/api/user', app.controller.api.user);
  app.post('/api/user.json', app.controller.api.user);
};
