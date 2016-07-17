'use strict';

module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/string', app.controller.home.string);
};
