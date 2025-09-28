'use strict';

module.exports = app => {
  app.get('/message', app.controller.message);
};
