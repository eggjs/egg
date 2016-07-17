'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.post('/upload', app.controller.upload);
};
