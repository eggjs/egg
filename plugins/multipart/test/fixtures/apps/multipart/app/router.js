'use strict';

module.exports = app => {
  app.post('/upload', app.controller.upload);
  app.post('/upload.json', app.controller.upload);
};
