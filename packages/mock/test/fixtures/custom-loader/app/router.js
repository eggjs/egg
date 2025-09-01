'use strict';

module.exports = app => {
  app.router.get('/users/:name', app.controller.user.get);
};
