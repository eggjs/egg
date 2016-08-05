'use strict';

module.exports = app => {
  app.get('/api/user.json', app.controller.api.user);
  app.post('/api/user', app.controller.api.user);
};
