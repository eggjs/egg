'use strict';

module.exports = app => {
  app.get('/', app.controller.home.index);
};
