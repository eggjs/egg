'use strict';

module.exports = app => {
  app.router.get('/users/:name', app.controller.user.get);
  app.router.get('/beforeLoad', app.controller.user.beforeLoad);
};
