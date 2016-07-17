'use strict';

module.exports = app => {
  const user = app.role.can('user');
  const admin = app.role.can('admin');
  app.get('/user', user, app.controller.user);
  app.get('/admin', admin, app.controller.admin);
};
