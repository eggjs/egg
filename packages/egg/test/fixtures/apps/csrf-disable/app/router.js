'use strict';

module.exports = app => {
  app.post('/api/user', app.controller.api.user);
};
