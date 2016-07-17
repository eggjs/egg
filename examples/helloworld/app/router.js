'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/foo', app.controller.foo);
};
